# Используем Node.js 18 с Alpine Linux
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем остальные файлы проекта
COPY . .

# Устанавливаем зависимости админ-панели
WORKDIR /app/admin
RUN npm ci --only=production

# Собираем админ-панель
RUN npm run build

# Возвращаемся в корневую директорию
WORKDIR /app

# Генерируем Prisma клиент
RUN npx prisma generate

# Собираем TypeScript проект
RUN npm run build

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
