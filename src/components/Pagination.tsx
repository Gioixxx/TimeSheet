import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './Pagination.module.css'

export default function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  return (
    <div className={styles.pagination}>
      <Link
        href={currentPage > 1 ? `/?page=${currentPage - 1}` : '#'}
        className={`${styles.button} ${currentPage <= 1 ? styles.disabled : ''}`}
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : 0}
      >
        <ChevronLeft size={16} />
        Precedente
      </Link>

      <div className={styles.pageInfo}>
        <span className={styles.pageNumber}>{currentPage}</span>
        <span className={styles.pageTotal}>di {totalPages}</span>
      </div>

      <Link
        href={currentPage < totalPages ? `/?page=${currentPage + 1}` : '#'}
        className={`${styles.button} ${currentPage >= totalPages ? styles.disabled : ''}`}
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : 0}
      >
        Successivo
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
