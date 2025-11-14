# 🕵️ Underpass CTF - Walkthrough

## 🔍 Initial Reconnaissance

I performed a scan with `nmap`

```bash
nmap -sC -sV -A 10.10.11.48
```

and detected two open ports:

- **🛡️ Port 22** → SSH
- **🌐 Port 80** → HTTP

Accessing the site on port 80, I discovered that all sections were blocked by Apache. I ran `gobuster`, but found nothing useful.

Subsequently, I tried an `nmap` scan on **UDP*** with

```bash
nmap -sC -sU -A 10.10.11.48
```

discovering some interesting ports, including one with an **SNMP** service.

## 📡 Enumeration with SNMP

Using `snmpwalk`, I obtained various information, including:

- 🧑‍💻 A user named **Steve**.
- 🎛️ The presence of a **RADIUS** server on another port.

From the service analysis, I discovered that the server in use was **Daloradius**. According to the documentation, the default path is `Website/daloradius`. However, trying to access it via browser, Apache blocked it.

At this point, I started `dirbuster` with a more in-depth scan on

```path
underpass.htb/daloradius 
```

and found an interesting file: `/app/operators/login.php`.

## 🔑 Daloradius Access

From the Daloradius documentation, the default credentials are:

- **🔐 Admin: admin**
- **🔐 Administrator: radius**

I tried the second option and successfully accessed the administration panel.

Inside, I found another user "svcMosh", his password was a hash, so I cracked it with `hashcat` and got the password "underwaterfriends".

## 🖥️ SSH Access

Using the found user and the cracked password, I managed to connect via SSH:

```bash
ssh svcMosh@10.10.11.48
```

Inside **svcMosh**'s home directory, I found the **🏴 user.txt** flag.

## 🚀 Privilege Escalation

To check the user's privileges, I ran:

```bash
sudo -l
```

I discovered that I could execute `mosh-server` without requiring the root password.

I started **mosh** with the command:

```bash
mosh --server="sudo /usr/bin/mosh-server" localhost
```

🔥 This gave me a shell with **root** privileges!

Inside the `/root/` directory, I found the **🏴 root.txt** flag.

---

🎯 **CTF successfully completed!** 