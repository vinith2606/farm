import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Leaf, Moon, ShieldCheck, ShoppingBag, Sprout, Sun, Truck } from 'lucide-react'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { useTheme } from '@/context/ThemeContext'
import type { UserRole } from '@/types'

const roles: Array<{ role: UserRole; icon: typeof Sprout; accent: string }> = [
  { role: 'farmer', icon: Sprout, accent: 'bg-primary/15 text-primary-light' },
  { role: 'consumer', icon: ShoppingBag, accent: 'bg-accent/15 text-accent' },
  { role: 'delivery', icon: Truck, accent: 'bg-blue/15 text-blue' },
  { role: 'admin', icon: ShieldCheck, accent: 'bg-earth/15 text-earth' },
]

const featureIcons = [Sprout, Leaf, ShoppingBag, ShieldCheck]

export default function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

    return (
      <div className="min-h-screen overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
          <div className="absolute -right-32 top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -left-40 bottom-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        </div>

        <header className="relative z-40 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-background shadow-lg shadow-primary/20"><Leaf className="h-6 w-6" /></span>
            <span><span className="block font-[family-name:var(--font-display)] text-lg font-bold tracking-wide">{t('app.name')}</span><span className="block text-xs text-muted">{t('landing.directFromGrowers')}</span></span>
          </button>
          <div className="flex items-center gap-2"><button type="button" onClick={toggleTheme} className="rounded-xl border border-border bg-surface/70 p-2.5 text-muted transition-colors hover:border-primary hover:text-primary" aria-label="Toggle theme">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button><div className="[&_button]:text-foreground"><LanguageSelector /></div></div>
        </header>

        <main className="relative z-10 mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-12">
          <section className="grid items-center gap-12 pb-16 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:pb-24 lg:pt-20">
            <div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-light"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {t('landing.localFoodConnected')}</motion.div>
              <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.6 }} className="max-w-3xl font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">{t('landing.heroTitle')}</motion.h1>
              <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.6 }} className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">{t('landing.heroSubtitle')}</motion.p>
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.6 }} className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={() => navigate('/login/consumer')} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-background shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">{t('landing.shopFreshProduce')} <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => navigate('/login/farmer')} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">{t('landing.joinAsFarmer')}</button></motion.div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {t('landing.verifiedGrowers')}</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {t('landing.fairerPricing')}</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {t('landing.localDelivery')}</span></div>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.16, duration: 0.7 }} className="relative min-h-[390px] overflow-hidden rounded-[2rem] border border-border bg-surface p-5 shadow-2xl shadow-black/20 sm:min-h-[470px] sm:p-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(52,211,153,0.2),transparent_32%),linear-gradient(145deg,#172235,#101827)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between"><div><p style={{ color: '#ffffff' }} className="text-xs font-semibold uppercase tracking-[0.16em] !text-white">{t('landing.todaysHarvest')}</p><h2 style={{ color: '#ffffff' }} className="mt-2 max-w-xs !text-white font-[family-name:var(--font-display)] text-3xl font-bold leading-tight sm:text-4xl">{t('landing.shorterJourney')}</h2></div><span className="rounded-xl bg-accent/15 p-3 text-accent"><Sprout className="h-6 w-6" /></span></div>
                <div className="relative mx-auto flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64"><div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/10" /><div className="absolute inset-5 rounded-full border border-accent/20 bg-accent/10" /><div className="absolute inset-10 flex items-center justify-center rounded-full bg-gradient-to-br from-accent to-earth text-7xl shadow-2xl shadow-accent/20">🥕</div><span className="absolute -right-2 top-7 rounded-xl border border-white/20 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white shadow-lg">{t('landing.harvestedToday')}</span><span className="absolute -left-5 bottom-8 rounded-xl border border-white/20 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white shadow-lg">{t('landing.nearbyFarms')}</span></div>
                <div className="grid grid-cols-3 gap-2 border-t border-border pt-5 text-center"><div><p className="font-[family-name:var(--font-display)] text-xl font-bold text-primary-light">100%</p><p className="text-[11px] text-muted">{t('landing.traceable')}</p></div><div><p className="font-[family-name:var(--font-display)] text-xl font-bold text-accent">24h</p><p className="text-[11px] text-muted">{t('landing.farmToDoor')}</p></div><div><p className="font-[family-name:var(--font-display)] text-xl font-bold text-blue">1:1</p><p className="text-[11px] text-muted">{t('landing.directTrade')}</p></div></div>
              </div>
            </motion.div>
          </section>

          <section className="border-t border-border py-12 lg:py-16"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary-light">{t('landing.chooseWorkspace')}</p><h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{t('landing.networkWaysIn')}</h2></div><p className="max-w-sm text-sm leading-6 text-muted">{t('landing.networkDescription')}</p></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{roles.map(({ role, icon: Icon, accent }, index) => <motion.button key={role} type="button" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: index * 0.08 }} whileHover={{ y: -4 }} onClick={() => navigate(`/login/${role}`)} className="group rounded-2xl border border-border bg-surface/70 p-5 text-left transition-colors hover:border-primary/50 hover:bg-surface-elevated"><div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}><Icon className="h-5 w-5" /></div><h3 className="font-[family-name:var(--font-display)] text-lg font-bold">{t(`landing.${role === 'delivery' ? 'delivery' : role}`)}</h3><p className="mt-2 min-h-12 text-sm leading-5 text-muted">{t(`landing.${role}Desc`)}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">{t('landing.getStarted')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></motion.button>)}</div></section>

          <section className="border-t border-border py-12 lg:py-16"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">{t('landing.whyFarmDirect')}</p><h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{t('landing.builtAroundTrust')}</h2></div><ChevronDown className="h-5 w-5 text-muted" /></div><div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((number, index) => { const Icon = featureIcons[index]; return <div key={number} className="border-l-2 border-primary/30 px-5 py-1"><Icon className="h-5 w-5 text-primary" /><h3 className="mt-4 font-semibold">{t(`landing.feature${number}Title`)}</h3><p className="mt-2 text-sm leading-6 text-muted">{t(`landing.feature${number}Desc`)}</p></div> })}</div></section>
        </main>
        <footer className="relative z-10 border-t border-border px-5 py-6 text-center text-xs text-muted sm:px-8">{t('app.name')} · {t('app.tagline')}</footer>
      </div>
    )
  }
