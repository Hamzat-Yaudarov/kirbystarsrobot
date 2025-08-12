import React, { useState, useEffect } from 'react'
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  People,
  Star,
  Assignment,
  Pets,
  Casino,
  LocalOffer,
  TrendingUp,
} from '@mui/icons-material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { statsApi } from '../services/api'

interface Stats {
  общее: {
    всегоПользователей: number
    активныхПользователей: number
    заблокированныхПользователей: number
    общийБалансПользователей: number
  }
  сегодня: {
    новыхПользователей: number
    кликов: number
  }
  задания: {
    всегоЗаданий: number
    активныхЗаданий: number
    выполненныхЗаданий: number
  }
  питомцы: {
    всегоПитомцев: number
    продано: number
  }
  лотереи: {
    активныхЛотерей: number
    билетовПродано: number
  }
  промокоды: {
    всегоПромокодов: number
    активныхПромокодов: number
    использовано: number
  }
  выводы: {
    ожидающие: number
    одобренные: number
    отклоненные: number
  }
  топРефереров: Array<{
    firstName: string
    username: string
    _count: { referrals: number }
  }>
  статистикаПоДням: Array<{
    date: string
    newUsers: number
  }>
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await statsApi.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
      setError('Ошибка загрузки статистики')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!stats) {
    return <Alert severity="warning">Нет данных для отображения</Alert>
  }

  const StatCard: React.FC<{
    title: string
    value: number | string
    icon: React.ReactNode
    color?: string
  }> = ({ title, value, icon, color = 'primary.main' }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        📊 Статистика бота
      </Typography>

      {/* Основные метрики */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего пользователей"
            value={stats.общее.всегоПользователей}
            icon={<People />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Активных пользователей"
            value={stats.общее.активныхПользователей}
            icon={<TrendingUp />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Новых за сегодня"
            value={stats.сегодня.новыхПользователей}
            icon={<People />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Общий баланс ⭐"
            value={stats.общее.общийБалансПользователей.toFixed(2)}
            icon={<Star />}
            color="warning.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* График регистраций */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              📈 Регистрации за последние 7 дней
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.статистикаПоДням}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#1976d2"
                  strokeWidth={2}
                  name="Новые пользователи"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Топ рефереров */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🏆 Топ рефереров
            </Typography>
            {stats.топРефереров.length > 0 ? (
              stats.топРефереров.map((user, index) => (
                <Box
                  key={index}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ py: 1, borderBottom: '1px solid #eee' }}
                >
                  <Typography variant="body2">
                    {user.firstName || user.username || 'Аноним'}
                  </Typography>
                  <Typography variant="body2" color="primary">
                    {user._count.referrals} реф.
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                Нет данных
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Статистика по модулям */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              📋 Задания
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <StatCard
                  title="Всего"
                  value={stats.задания.всегоЗаданий}
                  icon={<Assignment />}
                />
              </Grid>
              <Grid item xs={4}>
                <StatCard
                  title="Активных"
                  value={stats.задания.активныхЗаданий}
                  icon={<Assignment />}
                />
              </Grid>
              <Grid item xs={4}>
                <StatCard
                  title="Выполнено"
                  value={stats.задания.выполненныхЗаданий}
                  icon={<Assignment />}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🐾 Питомцы
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <StatCard
                  title="Всего видов"
                  value={stats.питомцы.всегоПитомцев}
                  icon={<Pets />}
                />
              </Grid>
              <Grid item xs={6}>
                <StatCard
                  title="Продано"
                  value={stats.питомцы.продано}
                  icon={<Pets />}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Остальная статистика */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🎰 Лотереи
            </Typography>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2">Активных:</Typography>
              <Typography variant="body2">{stats.лотереи.активныхЛотерей}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Билетов продано:</Typography>
              <Typography variant="body2">{stats.лотереи.билетовПродано}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🎫 Промокоды
            </Typography>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2">Всего:</Typography>
              <Typography variant="body2">{stats.промокоды.всегоПромокодов}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2">Активных:</Typography>
              <Typography variant="body2">{stats.промокоды.активныхПромокодов}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Использовано:</Typography>
              <Typography variant="body2">{stats.промокоды.использовано}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              💸 Выводы
            </Typography>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2">Ожидающие:</Typography>
              <Typography variant="body2" color="warning.main">
                {stats.выводы.ожидающие}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2">Одобренные:</Typography>
              <Typography variant="body2" color="success.main">
                {stats.выводы.одобренные}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Отклоненные:</Typography>
              <Typography variant="body2" color="error.main">
                {stats.выводы.отклоненные}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard
