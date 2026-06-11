import Header from './Header'
import styles from './PageLayout.module.css'

interface Props {
    children: React.ReactNode
}

export default function PageLayout({ children }: Props) {
    return (
        <div className={styles.layout}>
            <Header />
            <main className={styles.main}>{children}</main>
        </div>
    )
}