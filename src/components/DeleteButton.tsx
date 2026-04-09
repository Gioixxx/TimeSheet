'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteTimeEntry } from '@/app/actions'
import styles from './TimeEntryList.module.css'

export default function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm('Eliminare questa voce?')) return
    startTransition(async () => {
      await deleteTimeEntry(id)
    })
  }

  return (
    <button
      className={styles.deleteButton}
      disabled={isPending}
      title="Elimina"
      onClick={handleDelete}
    >
      <Trash2 size={15} />
    </button>
  )
}
