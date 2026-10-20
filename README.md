# Expense Tracker - He thong Quan ly Chi tieu

Du an web full-stack quan ly thu nhap va chi tieu ca nhan, trien khai tren Ubuntu VMware bang Docker Compose.

## 1. Cong nghe

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js 22, Express
- Database: PostgreSQL 17
- Database Administration: pgAdmin 4
- Reverse Proxy: Nginx
- Containerization: Docker Engine, Docker Compose
- Monitoring: Prometheus, Grafana, Node Exporter, PostgreSQL Exporter, cAdvisor, Blackbox Exporter
- Centralized Logging: Loki, Promtail, Grafana Explore

## 2. Chuc nang

- Dang ky va dang nhap tai khoan
- Quan ly danh muc thu nhap va chi tieu
- Them, xem va xoa giao dich
- Thong ke tong thu, tong chi va so du
- Luu du lieu vao PostgreSQL

## 3. Cau truc du an

```text
expense-tracker/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── public/index.html
├── nginx/
├── prometheus/
├── grafana/
├── blackbox/
├── loki/
├── promtail/
├── compose.yaml
├── compose.app.yaml
├── compose.nginx.yaml
├── compose.monitoring.yaml
├── compose.blackbox.yaml
├── compose.logging.yaml
├── .env.example
├── .gitignore
└── README.md
```

## 4. Cau hinh moi truong

Tao file `.env` tu `.env.example`:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Thay tat ca gia tri CHANGE_ME bang mat khau hoac khoa bi mat manh.

Luu y: Tai khoan expense_app can duoc tao va cap quyen PostgreSQL truoc khi khoi dong Backend. Khong dua file .env len GitHub.

## 5. Khoi dong he thong

Chay tai thu muc goc cua du an:

```bash
docker compose \
  -f compose.yaml \
  -f compose.app.yaml \
  -f compose.nginx.yaml \
  -f compose.monitoring.yaml \
  -f compose.blackbox.yaml \
  -f compose.logging.yaml \
  up -d --build
```

Kiem tra:

```bash
docker ps
```

Cau hinh hien tai su dung IP VMware 192.168.93.128.
Can cap nhat dia chi IP trong cac file Compose neu moi truong mang thay doi.

## 6. Truy cap dich vu

| Dich vu | Dia chi trong moi truong demo |
|---|---|
| Expense Tracker - Nginx | http://192.168.93.128 |
| Expense Tracker - Backend | http://192.168.93.128:8080 |
| pgAdmin | http://192.168.93.128:5050 |
| Prometheus | http://192.168.93.128:9090 |
| Grafana | http://192.168.93.128:3001 |
| Loki | http://127.0.0.1:3100 (tren Ubuntu) |

## 7. Giam sat he thong

Prometheus thu thap metrics tu:

- Prometheus
- Node Exporter
- PostgreSQL Exporter
- cAdvisor
- Blackbox Exporter

Grafana Dashboard hien thi CPU, RAM, Disk, bo nho Docker va ket noi PostgreSQL.

## 8. Quan ly log tap trung

Promtail thu thap Docker Logs va gui den Loki.
Grafana Explore ho tro truy van LogQL:

```logql
{job="expense-tracker", service="web"}
```

```logql
{job="expense-tracker", service="nginx"}
```

```logql
{job="expense-tracker", service="db"}
```

## 9. Security Hardening

- Backend su dung tai khoan Linux non-root.
- Tai khoan PostgreSQL expense_app duoc cap quyen gioi han.
- File .env co quyen 600 va duoc loai tru khoi Git.
- PostgreSQL khong publish cong 5432 ra host.
- Loki chi publish cong 3100 tren localhost.
- Mot so container bat no-new-privileges.
- cAdvisor dang su dung privileged cho nhu cau giam sat va can duoc danh gia khi trien khai production.
- Moi truong demo hien su dung HTTP, chua cau hinh HTTPS.

## 10. Ghi chu

Day la du an thuc hanh DevOps tren Ubuntu VMware.
Can bo sung quan ly secret, HTTPS, gioi han truy cap quan tri va cai thien phan tach Docker Network truoc khi trien khai production.
