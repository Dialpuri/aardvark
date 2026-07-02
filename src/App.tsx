import { Outlet } from 'react-router-dom'
import { Footer } from '@/components/Footer'
import styles from './App.module.css'

function App() {
  return (
    <div className={styles.app}>
      <div className={styles.main}>
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}

export default App
