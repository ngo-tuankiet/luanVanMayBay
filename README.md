# Huớng dẫn chạy project

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cài đặt Prisma client
```bash
# Tạo Prisma client
npm run db:generate

# Lấy schema từ database hiện tại
npm run db:pull
```

## Chạy project

### Development mode (có hot reload)

```bash
npm run dev
```

### Production mode

```bash
npm start
```

## Các lệnh hữu ích

### Database Operations

```bash
# Tạo và chạy migration
npm run db:migrate

# Đồng bộ schema với database
npm run db:push

# Lấy schema từ database hiện tại
npm run db:pull

# Mở Prisma Studio (GUI quản lý database)
npm run db:studio
```

### Code Formatting

```bash
# Format code với Prettier
npm run format
```