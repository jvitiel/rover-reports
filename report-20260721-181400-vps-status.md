# VPS Status Snapshot — 2026-07-21 18:14 UTC

## 1. Uptime and Load

```
18:14:25 up 127 days, 21:27,  0 user,  load average: 0.00, 0.00, 0.01
```

## 2. CPU (top batch snapshot)

```
top - 18:14:26 up 127 days, 21:27,  0 user,  load average: 0.00, 0.00, 0.01
Tasks: 125 total,   1 running, 124 sleeping,   0 stopped,   0 zombie
%Cpu(s): 20.8 us, 62.5 sy,  0.0 ni,  4.2 id, 12.5 wa,  0.0 hi,  0.0 si,  0.0 st 
MiB Mem :   3915.9 total,   1584.4 free,    897.3 used,   1720.9 buff/cache     
MiB Swap:    512.0 total,    475.3 free,     36.7 used.   3018.6 avail Mem 

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 678824 rover     20   0   42.1g 338016  51876 S  50.0   8.4  21:21.79 openclaw
 732850 rover     20   0    6112   2652   2064 D  33.3   0.1   0:00.06 du
 732852 rover     20   0    6188   2716   2064 D  25.0   0.1   0:00.06 du
 732855 rover     20   0    6012   2472   2064 D  25.0   0.1   0:00.04 du
 732845 rover     20   0   11928   5572   3444 R   8.3   0.1   0:00.01 top
      1 root      20   0   22668   8400   4904 S   0.0   0.2  21:25.22 systemd
```

Note: elevated CPU% in this snapshot is from the concurrent `du` commands run for this report; load averages (0.00/0.00/0.01) reflect the actual steady state. [INFERRED]

## 3. Memory and Swap

```
              total        used        free      shared  buff/cache   available
Mem:           3.8Gi       893Mi       1.6Gi       252Ki       1.7Gi       3.0Gi
Swap:          511Mi        36Mi       475Mi
```

36 MiB swap in use — minimal, not indicative of pressure. [INFERRED]

## 4. Disk — Filesystems

```
Filesystem      Size  Used Avail Use% Mounted on
tmpfs           392M 1012K  391M   1% /run
/dev/sda         79G   29G   47G  38% /
tmpfs           2.0G     0  2.0G   0% /dev/shm
tmpfs           5.0M     0  5.0M   0% /run/lock
tmpfs           392M   20K  392M   1% /run/user/0
```

## 5. Disk — Inodes

```
Filesystem      Inodes  IUsed   IFree IUse% Mounted on
tmpfs           501236    659  500577    1% /run
/dev/sda       5169408 325047 4844361    7% /
tmpfs           501236      1  501235    1% /dev/shm
tmpfs           501236      3  501233    1% /run/lock
tmpfs           100247     38  100209    1% /run/user/0
```

## 6. Largest Disk Consumers

### Top-level

```
7.6G    /home/shelter
2.7G    /home/rover
```

### /home/shelter subdirectories

```
6.0G    /home/shelter/backups/
1.4G    /home/shelter/shelter-apps/
103M    /home/shelter/rover-reports/
1008K   /home/shelter/4lg-theme/
208K    /home/shelter/scripts/
32K     /home/shelter/logs/
16K     /home/shelter/scratch/
```

### /home/rover subdirectories

```
187M    /home/rover/rover-reports-repo/
92M     /home/rover/rover-reports-screenshots-repo/
14M     /home/rover/rover/
1.6M    /home/rover/logs/
172K    /home/rover/eval-scratch/
88K     /home/rover/scripts/
8.0K    /home/rover/migration-scratch/
```

## 7. Key Services

| Service | Status |
|---------|--------|
| rover.service | active |
| caddy | active |
| shelter-app | active |

All three key services active. [VERIFIED]
