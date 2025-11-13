# Guia Visual - Módulo de Avaliação Modernizado

## 🎨 Paleta de Cores por Contexto

### Status Colors
```
pending_response       → 🟡 Yellow (#fbbf24) + bg-yellow-50
awaiting_manager       → 🔵 Blue (#3b82f6) + bg-blue-50
returned_for_adjustment→ 🟠 Orange (#f97316) + bg-orange-50
under_review          → 🟣 Purple (#a855f7) + bg-purple-50
approved              → 🟢 Green (#22c55e) + bg-green-50
rejected              → 🔴 Red (#ef4444) + bg-red-50
archived              → ⚫ Gray (#6b7280) + bg-gray-50
```

### Score Colors (Rating System)
```
5 estrelas (≥80%) → 🟢 Green (#22c55e) "Superou consistentemente"
4 estrelas (≥60%) → 🔵 Blue (#3b82f6) "Excedeu expectativas"
3 estrelas (≥40%) → 🟡 Yellow (#eab308) "Alcançou expectativa"
2 estrelas (≥20%) → 🟠 Orange (#f97316) "Não alcançou"
1 estrela  (<20%) → 🔴 Red (#ef4444) "Abaixo da expectativa"
```

### Section Colors
```
Autoavaliação  → Gradiente Blue 50 → Purple 50
Gerencial      → Gradiente Purple 50 → Pink 50
Estatísticas   → Blue 600, Green 600, Purple 600, Orange 600
```

---

## 📐 Layout Structures

### Dashboard (/avaliacao)
```
┌─────────────────────────────────────────────────────┐
│ Header: Title + "Nova Avaliação" Button            │
├─────────────────────────────────────────────────────┤
│ Stats Cards (Grid 4 cols)                          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│ │Pendentes│ │Aguardando│ │Concluídas│ │Requer  │  │
│ │   12    │ │    5     │ │    23    │ │ Ação 2 │  │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
├─────────────────────────────────────────────────────┤
│ Filtros (Grid 2 cols)                              │
│ ┌──────────────────┐ ┌──────────────────┐         │
│ │🔍 Buscar...      │ │📅 Período        │         │
│ └──────────────────┘ └──────────────────┘         │
├─────────────────────────────────────────────────────┤
│ Seção: 🕐 Pendentes de Resposta                    │
│ ┌───────┐ ┌───────┐ ┌───────┐                     │
│ │ Card  │ │ Card  │ │ Card  │ (Grid 3 cols)       │
│ │ João  │ │ Maria │ │ Pedro │                     │
│ └───────┘ └───────┘ └───────┘                     │
├─────────────────────────────────────────────────────┤
│ Seção: 📈 Aguardando Gerente                       │
│ ┌───────┐ ┌───────┐                               │
│ │ Card  │ │ Card  │                               │
│ └───────┘ └───────┘                               │
├─────────────────────────────────────────────────────┤
│ Seção: ✅ Concluídas                               │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐          │
│ │ Card  │ │ Card  │ │ Card  │ │ Card  │          │
│ └───────┘ └───────┘ └───────┘ └───────┘          │
└─────────────────────────────────────────────────────┘
```

### Evaluation Card Structure
```
┌─────────────────────────────────────┐
│ ┃ Status Badge          [→]         │ ← Left border colored by status
│ ┃                                   │
│ ┃ 👤 João Silva                     │
│ ┃ 📅 Q1 2025                        │
│ ┃ 🗓️ 01/01/2025 - 31/03/2025       │
│ ┃                                   │
│ ┃ Nota: ⭐⭐⭐⭐☆ 4.0               │
│ ┃                                   │
└─────────────────────────────────────┘
  ↑ Hover: shadow-lg + translate-y-1
```

---

### View Page (/avaliacao/ver/[id])
```
┌─────────────────────────────────────────────────────┐
│ ← Voltar para lista                                │
├─────────────────────────────────────────────────────┤
│ Header Card                                        │
│ ┌──────────────────────────────────────────────┐  │
│ │ Avaliação de Desempenho     [Status Badge]  │  │
│ ├──────────────────────────────────────────────┤  │
│ │ Grid 2x2:                                    │  │
│ │ ┌────────────┐ ┌────────────┐              │  │
│ │ │👤 João     │ │🎯 Avaliador│              │  │
│ │ └────────────┘ └────────────┘              │  │
│ │ ┌────────────┐ ┌────────────┐              │  │
│ │ │📅 Período  │ │✅ Criação  │              │  │
│ │ └────────────┘ └────────────┘              │  │
│ └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ Tabs: [Questionário] [Análises e Gráficos]        │
├─────────────────────────────────────────────────────┤
│ TAB 1: Questionário                                │
│                                                     │
│ ┌─ Autoavaliação (Colaborador) ──────────────────┐│
│ │ 👤 Questões 11-14 • Sua percepção      [▼]    ││
│ ├───────────────────────────────────────────────┤│
│ │ ┌─ Q11 Card ──────────────────────────────┐  ││
│ │ │ 11 Pontos Fortes                        │  ││
│ │ │ ⭐⭐⭐⭐⭐ 5/5                           │  ││
│ │ │ [Comentário textbox...]                 │  ││
│ │ └─────────────────────────────────────────┘  ││
│ │ ┌─ Q12 Card ────...                          ││
│ └───────────────────────────────────────────────┘│
│                                                     │
│ ┌─ Avaliação Gerencial ───────────────────────┐  │
│ │ 👥 Questões 15-17 • Gestor direto    [▼]   │  │
│ ├─────────────────────────────────────────────┤  │
│ │ ...                                         │  │
│ └─────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ TAB 2: Análises e Gráficos                         │
│                                                     │
│ Stats Grid 3 cols:                                 │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ │Média 4.2│ │Questões │ │Progresso│              │
│ │   de 5  │ │  7/7    │ │  100%   │              │
│ └─────────┘ └─────────┘ └─────────┘              │
│                                                     │
│ Charts Grid 2 cols:                                │
│ ┌──────────────────┐ ┌──────────────────┐        │
│ │ Radar Chart      │ │ Bar Chart        │        │
│ │ (Competências)   │ │ (Distribuição)   │        │
│ └──────────────────┘ └──────────────────┘        │
│                                                     │
│ Detalhamento:                                      │
│ ┌─────────────────────────────────────────────┐  │
│ │ Q11 [███████████░░] 4.5 Liderança           │  │
│ │ Q12 [████████████░] 4.8 Comunicação         │  │
│ │ ...                                         │  │
│ └─────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ Comentários Grid 2 cols:                           │
│ ┌────────────────┐ ┌────────────────┐            │
│ │Comentário      │ │Observações     │            │
│ │Avaliador       │ │Gerais          │            │
│ └────────────────┘ └────────────────┘            │
├─────────────────────────────────────────────────────┤
│                     [💾 Salvar Alterações]         │
└─────────────────────────────────────────────────────┘
```

---

## 🎬 Animações por Componente

### EvaluationCard (Lista)
```js
// Entrada escalonada
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }
transition: { delay: index * 0.05 }

// Hover
hover: {
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  y: -4
}
```

### WelcomeModal
```js
// Backdrop
initial: { opacity: 0 }
animate: { opacity: 1 }
exit: { opacity: 0 }

// Content
initial: { opacity: 0, scale: 0.95 }
animate: { opacity: 1, scale: 1 }
exit: { opacity: 0, scale: 0.95 }

// Step transition
initial: { opacity: 0, x: 20 }
animate: { opacity: 1, x: 0 }
exit: { opacity: 0, x: -20 }
```

### Accordion Sections
```js
// Header chevron
animate: { rotate: expanded ? 180 : 0 }
transition: { duration: 0.3 }

// Content
initial: { height: 0, opacity: 0 }
animate: { height: 'auto', opacity: 1 }
exit: { height: 0, opacity: 0 }
transition: { duration: 0.3 }
```

### Star Rating (Interactive)
```js
// Hover star
whileHover: { scale: 1.1 }
whileTap: { scale: 0.95 }

// Tooltip
className: "opacity-0 group-hover:opacity-100 transition-opacity"
```

### Charts & Stats
```js
// Stats cards
initial: { opacity: 0, scale: 0.9 }
animate: { opacity: 1, scale: 1 }
transition: { delay: index * 0.1 }

// Progress bars (in detalhamento)
initial: { width: 0 }
animate: { width: `${percentage}%` }
transition: { delay: 0.5 + index * 0.05, duration: 0.5 }
```

---

## 🧩 Componente Interactions

### StatusBadge
```tsx
// Props
status: 'pending_response' | 'awaiting_manager' | ...

// Render
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full">
  <span>emoji</span>
  <span>label</span>
</span>
```

### Star Rating System
```tsx
// Read-only (ViewEvaluationClient)
{[1,2,3,4,5].map(value => (
  <FiStar className={value <= score ? 'fill-yellow-400' : 'text-gray-300'} />
))}

// Interactive (QuestionarioAvaliacaoCardBased)
{ESCALA_AVALIACAO.map(({ valor, descricao }) => (
  <motion.button onClick={() => onChange(questionId, valor)}>
    <FiStar className={currentValue === valor ? 'fill-yellow-400' : 'text-gray-300'} />
    <Tooltip>{descricao}</Tooltip>
  </motion.button>
))}
```

### Accordion Toggle
```tsx
// State
const [expandedSections, setExpandedSections] = useState({
  autoavaliacao: true,
  gerencial: isManager
});

// Button
<button onClick={() => toggleSection('autoavaliacao')}>
  <h2>Autoavaliação</h2>
  <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
    <FiChevronDown />
  </motion.div>
</button>

// Content
<AnimatePresence>
  {expandedSections.autoavaliacao && (
    <motion.div initial={{...}} animate={{...}}>
      {questions.map(renderQuestion)}
    </motion.div>
  )}
</AnimatePresence>
```

---

## 📊 Data Flow

### Dashboard (EvaluationListClient)
```
page.tsx (Server Component)
  ↓ fetch evaluations, periods, employees
  ↓ cookies() for auth
  ↓
EvaluationListClient (Client Component)
  ↓ useState for filters
  ↓ filteredEvaluations logic
  ↓ categorization (pending, awaitingManager, completed)
  ↓
EvaluationCard (per evaluation)
  ↓ display data
  ↓ Link to /avaliacao/ver/{id}
```

### View Page (ViewEvaluationClient)
```
page.tsx (Server Component)
  ↓ fetch evaluation, criteria, employee, manager
  ↓ params.id from route
  ↓
ViewEvaluationClient (Client Component)
  ↓ useState: respostas, activeTab
  ↓ useEffect: setIsManagerView
  ↓
Tab 1: QuestionarioAvaliacaoCardBased
  ↓ respostas state
  ↓ onChange handler
  ↓ renderQuestion for each Q11-Q17
  ↓ renderStarRating (interactive)
  ↓
Tab 2: EvaluationCharts
  ↓ prepare radarData, scoreDistribution
  ↓ calculate average, progress
  ↓ render RadarChart, BarChart
  ↓ render detalhamento list
```

### Save Flow
```
User clicks star → onChange(questionId, { nota: valor })
User types comment → onChange(questionId, { ...prev, comentario })
  ↓
setRespostas(prev => ({ ...prev, [questionId]: value }))
  ↓
User clicks "Salvar" → handleSave()
  ↓
fetch(`/api/avaliacao/${id}`, { 
  method: 'PATCH', 
  body: ***REMOVED*** respostas }) 
})
  ↓
router.refresh() (revalidate Server Component data)
```

---

## 🎯 Responsive Breakpoints

### Grid Systems
```css
/* Stats cards */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4

/* Evaluation cards */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

/* Header info */
grid-cols-1 md:grid-cols-2

/* Filters */
grid-cols-1 md:grid-cols-2

/* Charts */
grid-cols-1 lg:grid-cols-2

/* Comments */
grid-cols-1 md:grid-cols-2
```

### Text Sizes
```css
/* Mobile → Desktop */
text-2xl → text-4xl (main title)
text-xl → text-3xl (section headers)
text-lg → text-2xl (card titles)
text-sm → text-base (body)
text-xs (metadata, helpers)
```

### Spacing Adjustments
```css
/* Container */
px-4 sm:px-6 lg:px-8

/* Section margins */
mb-6 md:mb-8

/* Card padding */
p-4 md:p-6 lg:p-8
```

---

## 🔧 Helper Classes

### ABZ Custom Classes
```css
.abz-container
/* max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 */

.abz-button-primary
/* bg-blue-600 hover:bg-blue-700 text-white */

.abz-button-secondary
/* border border-gray-300 hover:bg-gray-50 */

.abz-card
/* bg-white rounded-lg shadow p-6 */

.abz-gradient
/* bg-gradient-to-r from-blue-500 to-purple-600 */
```

### Utility Combinations
```css
/* Card hover effect */
hover:shadow-lg hover:-translate-y-1 transition-all duration-300

/* Focus ring */
focus:ring-2 focus:ring-blue-500 focus:border-transparent

/* Disabled state */
disabled:opacity-50 disabled:cursor-not-allowed

/* Loading state */
animate-pulse bg-gray-200
```

---

## 📱 Mobile Optimizations

### Touch Targets
- Minimum 44px height for all interactive elements
- Star buttons: w-10 h-10 (40px)
- Navigation buttons: px-6 py-3
- Accordion headers: p-6

### Overflow Handling
```tsx
// Long names
<p className="truncate">{employeeName}</p>

// Long descriptions
<p className="line-clamp-2">{description}</p>

// Scrollable areas
<div className="overflow-x-auto">
  <table>...</table>
</div>
```

### Mobile-Specific
```tsx
// Stack on mobile
<div className="flex flex-col md:flex-row">
  
// Hide on mobile
<div className="hidden md:block">

// Show only on mobile
<div className="md:hidden">
```

---

## 🎨 Icon Usage

### react-icons/fi (Feather Icons)
```tsx
FiPlus         → Nova Avaliação button
FiSearch       → Search input
FiFilter       → Filters button
FiClock        → Pendentes section, stats
FiTrendingUp   → Aguardando section, stats
FiCheckCircle  → Concluídas section, stats
FiAlertCircle  → Requer ação stats
FiStar         → Rating system
FiUser         → Colaborador info
FiUsers        → Avaliador, seção gerencial
FiCalendar     → Período, dates
FiArrowLeft    → Voltar link
FiSave         → Salvar button
FiChevronDown  → Accordion toggle
FiChevronUp    → (unused, rotation used instead)
```

### Icon Sizes
```tsx
w-4 h-4  → Small (inline with text)
w-5 h-5  → Medium (buttons)
w-6 h-6  → Large (section headers)
w-7 h-7  → Extra large (modal icons)
w-8 h-8  → Rating stars (read-only)
w-10 h-10 → Rating stars (interactive)
```

---

## 🌐 Internationalization Ready

### Current: Portuguese (pt-BR)
All labels currently in Portuguese. Strings are hardcoded for simplicity.

### Future i18n Structure
```tsx
// Labels to externalize
const labels = {
  'pt-BR': {
    'evaluation.title': 'Avaliações de Desempenho',
    'evaluation.new': 'Nova Avaliação',
    'evaluation.pending': 'Pendentes',
    'evaluation.awaiting': 'Aguardando Gerente',
    // ...
  },
  'en-US': {
    'evaluation.title': 'Performance Evaluations',
    'evaluation.new': 'New Evaluation',
    // ...
  }
}
```

---

## 📋 Accessibility Checklist

### Implemented
- ✅ Semantic HTML (header, section, article)
- ✅ ARIA labels on interactive elements
- ✅ Focus states (focus:ring-2)
- ✅ Color contrast (WCAG AA compliant)
- ✅ Touch targets (≥44px)

### To Improve
- ⏳ Keyboard navigation (accordion, tabs, star rating)
- ⏳ Screen reader announcements (live regions)
- ⏳ Skip links
- ⏳ ARIA expanded states
- ⏳ Focus trap in modal

---

## 🎓 Learning Resources

### Framer Motion Patterns
- **Stagger children**: delay based on index
- **AnimatePresence**: for mount/unmount animations
- **Layout animations**: `layout` prop for smooth transitions
- **Variants**: for complex orchestration

### Recharts Best Practices
- Use `ResponsiveContainer` for fluid layouts
- Customize tooltips for better UX
- Use `Cell` for individual bar colors
- Keep charts simple and readable

### Tailwind Tips
- Use design tokens (colors, spacing)
- Compose utilities, don't repeat
- Use `@apply` sparingly (prefer composition)
- Leverage arbitrary values: `w-[calc(100%-2rem)]`

---

**End of Visual Guide**
