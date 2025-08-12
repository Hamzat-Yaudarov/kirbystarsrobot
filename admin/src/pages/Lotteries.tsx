import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowParams,
} from '@mui/x-data-grid'
import { Add, Edit, Delete, EmojiEvents, Stop } from '@mui/icons-material'
import { lotteriesApi } from '../services/api'

interface Lottery {
  id: string
  название: string
  ценаБилета: number
  всегоБилетов: number
  проданоБилетов: number
  комиссия: number
  призовойФонд: number
  активна: boolean
  автоВыбор: boolean
  датаОкончания?: string
  победительВыбран: boolean
  участников: number
}

const Lotteries: React.FC = () => {
  const [lotteries, setLotteries] = useState<Lottery[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLottery, setEditingLottery] = useState<Lottery | null>(null)
  const [formData, setFormData] = useState({
    название: '',
    описание: '',
    ценаБилета: '',
    всегоБилетов: '',
    комиссия: '',
    автоВыбор: true,
    датаОкончания: '',
  })

  useEffect(() => {
    loadLotteries()
  }, [])

  const loadLotteries = async () => {
    try {
      setLoading(true)
      const response = await lotteriesApi.getLotteries()
      setLotteries(response.data)
    } catch (error) {
      setError('Ошибка загрузки лотерей')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingLottery(null)
    setFormData({
      название: '',
      описание: '',
      ценаБилета: '',
      всегоБилетов: '',
      комиссия: '10',
      ав��оВыбор: true,
      датаОкончания: '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        название: formData.название,
        описание: formData.описание,
        ценаБилета: parseFloat(formData.ценаБилета),
        всегоБилетов: parseInt(formData.всегоБилетов),
        комиссия: parseFloat(formData.комиссия),
        автоВыбор: formData.автоВыбор,
        датаОкончания: formData.датаОкончания || null,
      }

      await lotteriesApi.createLottery(data)
      setDialogOpen(false)
      loadLotteries()
    } catch (error) {
      console.error('Ошибка сохранения лотереи:', error)
    }
  }

  const handleFinish = async (lottery: Lottery) => {
    if (window.confirm(`Завершить лотерею "${lottery.название}"?`)) {
      try {
        await lotteriesApi.finishLottery(lottery.id)
        loadLotteries()
      } catch (error) {
        console.error('Ошибка завершения лотереи:', error)
      }
    }
  }

  const handleDelete = async (lottery: Lottery) => {
    if (window.confirm(`Удалить лотерею "${lottery.название}"? Средства будут возвращены участникам.`)) {
      try {
        await lotteriesApi.deleteLottery(lottery.id)
        loadLotteries()
      } catch (error) {
        console.error('Ошибка удаления лотереи:', error)
      }
    }
  }

  const columns: GridColDef[] = [
    { field: 'название', headerName: 'Название', width: 200 },
    { field: 'ценаБилета', headerName: 'Цена билета ⭐', width: 140, type: 'number' },
    { field: 'всегоБилетов', headerName: 'Всего билетов', width: 120, type: 'number' },
    { field: 'проданоБилетов', headerName: 'Продано', width: 100, type: 'number' },
    { field: 'призовойФонд', headerName: 'Приз ⭐', width: 120, type: 'number' },
    { field: 'комиссия', headerName: 'Комиссия %', width: 120, type: 'number' },
    {
      field: 'активна',
      headerName: 'Статус',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.победительВыбран ? 'Завершена' : params.value ? 'Активна' : 'Неактивна'}
          color={params.row.победительВыбран ? 'default' : params.value ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Действия',
      width: 150,
      getActions: (params: GridRowParams) => [
        ...(params.row.активна && !params.row.победительВыбран ? [
          <GridActionsCellItem
            icon={<EmojiEvents />}
            label="Завершить"
            onClick={() => handleFinish(params.row)}
          />
        ] : []),
        <GridActionsCellItem
          icon={<Delete />}
          label="Удалить"
          onClick={() => handleDelete(params.row)}
        />,
      ],
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">🎰 Управление лотереями</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Создать лотерею
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={lotteries}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать лотерею</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Название"
              value={formData.название}
              onChange={(e) => setFormData({ ...formData, название: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Описание"
              multiline
              rows={3}
              value={formData.описание}
              onChange={(e) => setFormData({ ...formData, описание: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Цена билета (звёзды)"
              type="number"
              value={formData.ценаБилета}
              onChange={(e) => setFormData({ ...formData, ценаБилета: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Количество билетов"
              type="number"
              value={formData.всегоБилетов}
              onChange={(e) => setFormData({ ...formData, всегоБилетов: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Комиссия (%)"
              type="number"
              value={formData.комиссия}
              onChange={(e) => setFormData({ ...formData, комиссия: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.автоВыбор}
                  onChange={(e) => setFormData({ ...formData, автоВыбор: e.target.checked })}
                />
              }
              label="Автоматический выбор победителя"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.название || !formData.описание || !formData.ценаБилета || !formData.всегоБилетов}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Lotteries
