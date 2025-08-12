import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Grid,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowParams,
} from '@mui/x-data-grid'
import {
  Visibility,
  Block,
  Delete,
  AccountBalanceWallet,
  PersonOff,
  PersonAdd,
} from '@mui/icons-material'
import { usersApi } from '../services/api'

interface User {
  id: string
  telegramId: string
  имя: string
  username?: string
  баланс: number
  рефералов: number
  заданийВыполнено: number
  питомцев: number
  активен: boolean
  заблокирован: boolean
  датаРегистрации: string
  последнийКлик?: string
  кейсовОткрыто: number
  еженедельныеРефералы: number
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('все')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userDetailOpen, setUserDetailOpen] = useState(false)
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceOperation, setBalanceOperation] = useState('добавить')

  useEffect(() => {
    loadUsers()
  }, [status, search])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {
        статус: status,
        поиск: search,
        лимит: 100,
      }
      const response = await usersApi.getUsers(params)
      setUsers(response.data.пользователи)
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error)
      setError('Ошибка загрузки пользователей')
    } finally {
      setLoading(false)
    }
  }

  const handleViewUser = async (user: User) => {
    try {
      const response = await usersApi.getUser(user.id)
      setSelectedUser(response.data)
      setUserDetailOpen(true)
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error)
    }
  }

  const handleBanUser = async (user: User) => {
    try {
      if (user.заблокирован) {
        await usersApi.unbanUser(user.id)
      } else {
        await usersApi.banUser(user.id)
      }
      loadUsers()
    } catch (error) {
      console.error('Ошибка блокировки пользователя:', error)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Удалить пользователя ${user.имя}? Это действие необратимо.`)) {
      try {
        await usersApi.deleteUser(user.id)
        loadUsers()
      } catch (error) {
        console.error('Ошибка удаления пользователя:', error)
      }
    }
  }

  const handleBalanceUpdate = async () => {
    if (!selectedUser || !balanceAmount) return

    try {
      await usersApi.updateBalance(
        selectedUser.id,
        parseFloat(balanceAmount),
        balanceOperation
      )
      setBalanceDialogOpen(false)
      setBalanceAmount('')
      loadUsers()
    } catch (error) {
      console.error('Ошибка изменения баланса:', error)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'имя',
      headerName: 'Имя',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.username && (
            <Typography variant="caption" color="textSecondary">
              @{params.row.username}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'telegramId',
      headerName: 'Telegram ID',
      width: 120,
    },
    {
      field: 'баланс',
      headerName: 'Баланс ⭐',
      width: 100,
      type: 'number',
      valueFormatter: (params) => params.value.toFixed(2),
    },
    {
      field: 'рефералов',
      headerName: 'Рефералов',
      width: 100,
      type: 'number',
    },
    {
      field: 'заданийВыполнено',
      headerName: 'Заданий',
      width: 100,
      type: 'number',
    },
    {
      field: 'питомцев',
      headerName: 'Питомцев',
      width: 100,
      type: 'number',
    },
    {
      field: 'статус',
      headerName: 'Статус',
      width: 120,
      renderCell: (params) => (
        <Box>
          {params.row.заблокирован ? (
            <Chip label="Заблокирован" color="error" size="small" />
          ) : params.row.активен ? (
            <Chip label="Активен" color="success" size="small" />
          ) : (
            <Chip label="Неактивен" color="default" size="small" />
          )}
        </Box>
      ),
    },
    {
      field: 'датаРегистрации',
      headerName: 'Регистрация',
      width: 120,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('ru-RU'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Действия',
      width: 200,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={<Visibility />}
          label="Просмотр"
          onClick={() => handleViewUser(params.row)}
        />,
        <GridActionsCellItem
          icon={<AccountBalanceWallet />}
          label="Баланс"
          onClick={() => {
            setSelectedUser(params.row)
            setBalanceDialogOpen(true)
          }}
        />,
        <GridActionsCellItem
          icon={params.row.заблокирован ? <PersonAdd /> : <PersonOff />}
          label={params.row.заблокирован ? 'Разблокировать' : 'Заблокировать'}
          onClick={() => handleBanUser(params.row)}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Удалить"
          onClick={() => handleDeleteUser(params.row)}
        />,
      ],
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        👥 Управление пользователями
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Фильтры */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Поиск по имени или ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadUsers()}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Статус</InputLabel>
            <Select
              value={status}
              label="Статус"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="все">Все</MenuItem>
              <MenuItem value="активные">Активные</MenuItem>
              <MenuItem value="неактивные">Неактивные</MenuItem>
              <MenuItem value="заблокированные">Заблокированные</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={loadUsers}
            sx={{ height: '56px' }}
          >
            Найти
          </Button>
        </Grid>
      </Grid>

      {/* Таблица пользователей */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Диалог с деталями пользователя */}
      <Dialog
        open={userDetailOpen}
        onClose={() => setUserDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Детальная информация о пользователе</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Основная информация
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography><strong>Имя:</strong> {selectedUser.имя}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Username:</strong> {selectedUser.username || 'Нет'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Telegram ID:</strong> {selectedUser.telegramId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Баланс:</strong> {selectedUser.баланс} ⭐</Typography>
                </Grid>
              </Grid>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Дополнительная информация
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography><strong>Рефералов:</strong> {selectedUser.рефералов}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography><strong>Заданий выполнено:</strong> {selectedUser.заданийВыполнено}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography><strong>��итомцев:</strong> {selectedUser.питомцев}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Кейсов открыто:</strong> {selectedUser.кейсовОткрыто}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Еженедельные рефералы:</strong> {selectedUser.еженедельныеРефералы}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Статус:</strong>
                    {selectedUser.заблокирован ? ' Заблокирован' : selectedUser.активен ? ' Активен' : ' Неактивен'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Последний клик:</strong>
                    {selectedUser.последнийКлик
                      ? new Date(selectedUser.последнийКлик).toLocaleDateString('ru-RU')
                      : ' Никогда'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог изменения баланса */}
      <Dialog
        open={balanceDialogOpen}
        onClose={() => setBalanceDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Изменить баланс пользователя</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Сумма"
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Операция</InputLabel>
              <Select
                value={balanceOperation}
                label="Операция"
                onChange={(e) => setBalanceOperation(e.target.value)}
              >
                <MenuItem value="добавить">Добавить к балансу</MenuItem>
                <MenuItem value="установить">Установить баланс</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBalanceDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleBalanceUpdate}
            variant="contained"
            disabled={!balanceAmount}
          >
            Применить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Users
