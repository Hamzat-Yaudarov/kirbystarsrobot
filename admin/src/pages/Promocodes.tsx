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
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowParams,
} from '@mui/x-data-grid'
import {
  Add,
  Edit,
  Delete,
  Visibility,
  ToggleOn,
  ToggleOff,
} from '@mui/icons-material'
import { promocodesApi } from '../services/api'

interface Promocode {
  id: string
  код: string
  награда: number
  лимитИспользований?: number
  использовано: number
  активен: boolean
  датаСоздания: string
  остатокИспользований?: number
}

const Promocodes: React.FC = () => {
  const [promocodes, setPromocodes] = useState<Promocode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPromocode, setEditingPromocode] = useState<Promocode | null>(null)
  const [formData, setFormData] = useState({
    код: '',
    награда: '',
    лимитИспользований: '',
  })

  useEffect(() => {
    loadPromocodes()
  }, [])

  const loadPromocodes = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await promocodesApi.getPromocodes()
      setPromocodes(response.data)
    } catch (error) {
      console.error('Ошибка загрузки промокодов:', error)
      setError('Ошибка загрузки промокодов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPromocode(null)
    setFormData({ код: '', награда: '', лимитИспользований: '' })
    setDialogOpen(true)
  }

  const handleEdit = (promocode: Promocode) => {
    setEditingPromocode(promocode)
    setFormData({
      код: promocode.код,
      награда: promocode.награда.toString(),
      лимитИспользований: promocode.лимитИспользований?.toString() || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        код: formData.код,
        награда: parseFloat(formData.награда),
        лимитИспользований: formData.лимитИспользований 
          ? parseInt(formData.лимитИспользований) 
          : null,
      }

      if (editingPromocode) {
        await promocodesApi.updatePromocode(editingPromocode.id, data)
      } else {
        await promocodesApi.createPromocode(data)
      }

      setDialogOpen(false)
      loadPromocodes()
    } catch (error) {
      console.error('Ошибка сохранения промокода:', error)
    }
  }

  const handleDelete = async (promocode: Promocode) => {
    if (window.confirm(`Удалить промокод ${promocode.код}?`)) {
      try {
        await promocodesApi.deletePromocode(promocode.id)
        loadPromocodes()
      } catch (error) {
        console.error('Ошибка удаления промокода:', error)
      }
    }
  }

  const handleToggle = async (promocode: Promocode) => {
    try {
      await promocodesApi.togglePromocode(promocode.id)
      loadPromocodes()
    } catch (error) {
      console.error('Ошибка изменения статуса промокода:', error)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'код',
      headerName: 'Промокод',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'награда',
      headerName: 'Награда ⭐',
      width: 120,
      type: 'number',
    },
    {
      field: 'лимитИспользований',
      headerName: 'Лимит',
      width: 100,
      renderCell: (params) => params.value || '∞',
    },
    {
      field: 'использовано',
      headerName: 'Использовано',
      width: 120,
      type: 'number',
    },
    {
      field: 'остатокИспользований',
      headerName: 'Осталось',
      width: 100,
      renderCell: (params) => {
        if (params.row.лимитИспользований) {
          const остаток = params.row.лимитИспользований - params.row.использовано
          return остаток > 0 ? остаток : 0
        }
        return '∞'
      },
    },
    {
      field: 'активен',
      headerName: 'Статус',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Активен' : 'Неактивен'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'датаСоздания',
      headerName: 'Создан',
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
          icon={<Edit />}
          label="Редактировать"
          onClick={() => handleEdit(params.row)}
        />,
        <GridActionsCellItem
          icon={params.row.активен ? <ToggleOff /> : <ToggleOn />}
          label={params.row.активен ? 'Деактивировать' : 'Активировать'}
          onClick={() => handleToggle(params.row)}
        />,
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
        <Typography variant="h4">
          🎫 Управление промокодами
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreate}
        >
          Создать промокод
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={promocodes}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Диалог создания/редактирования */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPromocode ? 'Редактировать промокод' : 'Создать промокод'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Код промокода"
              value={formData.код}
              onChange={(e) => setFormData({ ...formData, код: e.target.value.toUpperCase() })}
              sx={{ mb: 2 }}
              helperText="Латинские буквы и цифры"
            />
            <TextField
              fullWidth
              label="Награда (звёзды)"
              type="number"
              value={formData.награда}
              onChange={(e) => setFormData({ ...formData, награда: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Лимит использований"
              type="number"
              value={formData.лимитИспользований}
              onChange={(e) => setFormData({ ...formData, лимитИспользований: e.target.value })}
              helperText="Оставьте пустым для неограниченного использования"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.код || !formData.награда}
          >
            {editingPromocode ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Promocodes
