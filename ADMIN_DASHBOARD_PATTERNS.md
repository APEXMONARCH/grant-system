# Admin Dashboard Design Patterns & CSS Classes

## 1. OVERALL LAYOUT STRUCTURE

### Main Container Structure
```html
<div class="app-container">
  <aside class="sidebar"></aside>
  <div class="sidebar-overlay"></div>
  <main class="main-content">
    <header class="topbar"></header>
    <div class="content-wrapper"></div>
  </main>
</div>
```

### CSS Variables (Design System)
```css
Color Palette:
  --primary-blue: #1a56db
  --primary-dark: #1e429f
  --sidebar-blue: #0a2b4e
  --sidebar-dark: #082032
  --success: #10b981
  --warning: #f59e0b
  --danger: #ef4444
  --info: #3b82f6
  --white: #ffffff
  --gray-50 through --gray-900

Spacing (8px grid):
  --space-xs: 4px
  --space-sm: 8px
  --space-md: 16px
  --space-lg: 24px
  --space-xl: 32px
  --space-2xl: 48px

Shadows:
  --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl

Border Radius:
  --radius-sm: 6px
  --radius-md: 8px
  --radius-lg: 12px
  --radius-xl: 16px

Transitions:
  --transition-fast: 150ms ease
  --transition-base: 250ms ease
  --transition-slow: 350ms ease
```

---

## 2. SIDEBAR COMPONENT

### Structure
```html
<aside class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="logo">
      <i class="fas fa-hand-holding-heart"></i>
      <span>Grant Management System</span>
    </div>
    <button class="sidebar-toggle" id="sidebarToggle">
      <i class="fas fa-bars"></i>
    </button>
  </div>
  
  <nav class="sidebar-nav">
    <a href="index.html" class="nav-item active">
      <i class="fas fa-tachometer-alt"></i>
      <span>Dashboard</span>
    </a>
    <!-- More nav items... -->
  </nav>
  
  <div class="sidebar-footer">
    <div class="user-info-mini">
      <i class="fas fa-user-circle"></i>
      <span>Admin User</span>
    </div>
  </div>
</aside>
<div class="sidebar-overlay" id="sidebarOverlay"></div>
```

### Sidebar CSS Classes
- `.sidebar` - Main container (280px fixed width, left-aligned, gradient background)
- `.sidebar-header` - Logo and navigation area
- `.logo` - Logo with icon and system name
- `.sidebar-toggle` - Mobile menu button (hidden on desktop)
- `.sidebar-nav` - Navigation list container
- `.nav-item` - Individual nav link
  - `.nav-item.active` - Current page indicator (left border, highlight)
  - `.nav-item:hover` - Hover effect (background change)
- `.sidebar-footer` - User info at bottom
- `.user-info-mini` - Mini user display
- `.sidebar-overlay` - Mobile sidebar backdrop

### Key Sidebar Styles
- Fixed positioning on left (0, top 0, bottom 0)
- Gradient background: `linear-gradient(135deg, #0a2b4e, #082032)`
- Width: 280px (fixed)
- Active state: Left border 3px solid + background highlight
- Mobile: Transforms off-screen with overlay backdrop

---

## 3. TOPBAR/HEADER COMPONENT

### Structure
```html
<header class="topbar">
  <button class="mobile-menu-btn" id="mobileMenuBtn">
    <i class="fas fa-bars"></i>
  </button>
  <h1 class="page-title">Dashboard</h1>
  <div class="topbar-actions">
    <button class="icon-btn" id="notificationBtn">
      <i class="fas fa-bell"></i>
      <span class="badge">3</span>
    </button>
    <div class="profile-dropdown">
      <button class="profile-btn" id="profileBtn">
        <img src="..." alt="Profile" class="avatar">
        <i class="fas fa-chevron-down"></i>
      </button>
      <div class="dropdown-menu" id="profileDropdown">
        <a href="#"><i class="fas fa-user"></i> Profile</a>
        <a href="settings.html"><i class="fas fa-cog"></i> Settings</a>
        <hr>
        <a href="signup.html"><i class="fas fa-sign-out-alt"></i> Logout</a>
      </div>
    </div>
  </div>
</header>
```

### Topbar CSS Classes
- `.topbar` - Main header (sticky, white background, shadow)
- `.mobile-menu-btn` - Mobile hamburger button (hidden on desktop)
- `.page-title` - Page heading (h1)
- `.topbar-actions` - Right-side action buttons container
- `.icon-btn` - Icon-only buttons (notification, etc.)
  - `.icon-btn .badge` - Red notification badge
- `.profile-dropdown` - Profile dropdown container
- `.profile-btn` - Profile button with avatar
- `.avatar` - Profile image (40x40px circle)
- `.dropdown-menu` - Profile dropdown menu
  - `.dropdown-menu.show` - Visible state
  - `.dropdown-menu a` - Menu items

### Key Topbar Styles
- Sticky positioning (z-index: 100)
- Flexbox layout with space-between
- Padding: 16px 24px
- Box shadow: var(--shadow-sm)

---

## 4. CONTENT WRAPPER

### Structure
```html
<div class="content-wrapper">
  <!-- All main page content -->
</div>
```

### Content Wrapper CSS Classes
- `.content-wrapper` - Main content area container
  - Padding: 32px on desktop, 16px on tablet, 8px on mobile
  - Width: 100% with overflow-x: hidden
  - Margin: 0 auto on desktop (max 1400px)

---

## 5. STAT CARDS (Dashboard)

### Structure
```html
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-icon">
      <i class="fas fa-dollar-sign"></i>
    </div>
    <div class="stat-info">
      <h3>Total Funds</h3>
      <p class="stat-value">$500,000</p>
      <span class="stat-trend positive">
        <i class="fas fa-arrow-up"></i> +12.5%
      </span>
    </div>
  </div>
</div>
```

### Stat Card CSS Classes
- `.stats-grid` - Grid container
  - Mobile: flex column, single column
  - Tablet+: grid with 3 columns (gap: 24px)
- `.stat-card` - Individual stat card
  - Background: white
  - Border-radius: 12px
  - Padding: 24px
  - Box-shadow: var(--shadow-md)
  - Hover: translateY(-2px) + larger shadow
  - Layout: Flexbox with icon on left
- `.stat-icon` - Icon box (60x60px)
  - Default: Blue gradient background
  - `.stat-icon.allocated` - Orange gradient
  - `.stat-icon.remaining` - Green gradient
  - Centered flexbox, 28px font
- `.stat-info` - Text content area
- `.stat-value` - Large value text (1.5rem, bold)
- `.stat-trend` - Trend indicator
  - `.stat-trend.positive` - Green background, success color
  - `.stat-trend.neutral` - Blue background, info color
  - `.stat-trend.negative` - Red background, danger color

---

## 6. CARDS COMPONENT

### Structure
```html
<div class="card">
  <div class="card-header">
    <h2>Card Title</h2>
    <a href="#" class="view-all">View All <i class="fas fa-arrow-right"></i></a>
  </div>
  <div class="card-body">
    <!-- Content -->
  </div>
</div>
```

### Card CSS Classes
- `.card` - Main card container
  - Background: white
  - Border-radius: 12px
  - Padding: 0 (internal sections have padding)
  - Box-shadow: var(--shadow-md)
  - Margin-bottom: 32px
  - Hover: var(--shadow-lg)
  - Width: 100%, overflow: hidden
- `.card-header` - Header section
  - Padding: 24px
  - Border-bottom: 1px solid #e5e7eb
  - Flexbox: space-between
  - Gap: 8px, flex-wrap: wrap
- `.card-header h2` - Title (1.25rem, 0 margin-bottom)
- `.view-all` - "View All" link
  - Color: primary-blue
  - Text-decoration: none
  - Font-size: 0.875rem
  - White-space: nowrap
  - Hover: primary-dark color
- `.card-body` - Content area
  - Padding: 24px
  - Width: 100%, overflow-x: auto (for tables)

---

## 7. BUTTONS

### Primary Button
```html
<a href="#" class="btn-primary">
  <i class="fas fa-plus"></i>
  <span>New Grant</span>
</a>
```

### Button CSS Classes
- `.btn-primary` - Primary action button
  - Background: primary-blue, hover: primary-dark
  - Color: white
  - Padding: 8px 24px
  - Border-radius: 8px
  - Display: inline-flex
  - Gap: 8px
  - Hover: translateY(-1px), shadow-md
  - Font-weight: 500

- `.btn-secondary` - Secondary button
  - Background: gray-100, hover: gray-200
  - Color: gray-700
  - Border: 1px solid gray-300
  - Similar padding and styling as primary

- `.btn-small` - Small variant
  - Padding: 8px 16px
  - Font-size: 0.875rem

- Action buttons in tables: `.edit-btn`, `.delete-btn`, `.view-btn`
  - Background: transparent
  - Colored on hover (blue/red/green)

- `.action-btn` - Generic action button
  - Transparent background
  - Small padding: 4px 8px
  - Hover: gray-100 background

---

## 8. TABLES

### Structure
```html
<div class="table-responsive">
  <table class="data-table">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="grant-name">Mount Pond</td>
        <td class="amount">$220,000</td>
        <td><span class="badge success">Active</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

### Table CSS Classes
- `.table-responsive` - Wrapper for horizontal scrolling
  - Overflow-x: auto
  - -webkit-overflow-scrolling: touch
  - Width: 100%

- `.data-table` - Main table element
  - Width: 100%
  - Border-collapse: collapse
  - Min-width: 500px

- `.data-table thead` - Header section
  - Background: gray-50

- `.data-table th` - Header cells
  - Text-align: left
  - Padding: 16px
  - Font-weight: 600
  - Color: gray-600
  - Font-size: 0.875rem
  - Border-bottom: 2px solid gray-200

- `.data-table td` - Data cells
  - Padding: 16px
  - Border-bottom: 1px solid gray-200
  - Color: gray-700

- `.data-table tbody tr` - Rows
  - Hover: background gray-50, transform scale(1.01), shadow-sm

- `.grant-name`, `.applicant-name` - Name columns
  - Font-weight: 500
  - Color: gray-800

- `.amount` - Currency columns
  - Font-weight: 600
  - Color: primary-blue
  - White-space: nowrap

- `.table-info` - Results count text below table
  - Font-size: 0.875rem
  - Color: gray-500

---

## 9. BADGES/TAGS

### Structure
```html
<span class="badge success">Active</span>
<span class="badge warning">Under Review</span>
<span class="badge danger">Rejected</span>
<span class="badge info">Submitted</span>
```

### Badge CSS Classes
- `.badge` - Base badge style
  - Display: inline-flex
  - Align-items: center
  - Padding: 4px 8px
  - Border-radius: 6px
  - Font-size: 0.75rem
  - Font-weight: 600
  - White-space: nowrap

- `.badge.success` - Green badge
  - Background: rgba(16, 185, 129, 0.1)
  - Color: #10b981

- `.badge.warning` - Orange badge
  - Background: rgba(245, 158, 11, 0.1)
  - Color: #f59e0b

- `.badge.danger` - Red badge
  - Background: rgba(239, 68, 68, 0.1)
  - Color: #ef4444

- `.badge.info` - Blue badge
  - Background: rgba(59, 130, 246, 0.1)
  - Color: #3b82f6

---

## 10. FILTERS CARD

### Structure
```html
<div class="filters-card">
  <div class="filters-grid">
    <div class="filter-group">
      <label for="statusFilter">Status</label>
      <select id="statusFilter" class="filter-select">
        <option value="all">All Status</option>
      </select>
    </div>
    
    <div class="filter-group search-group">
      <label for="searchInput">Search</label>
      <div class="search-wrapper">
        <i class="fas fa-search"></i>
        <input type="text" id="searchInput" placeholder="Search..." class="search-input">
      </div>
    </div>
  </div>
</div>
```

### Filter CSS Classes
- `.filters-card` - Main filters container
  - Background: white
  - Border-radius: 12px
  - Padding: 24px
  - Margin-bottom: 32px
  - Box-shadow: var(--shadow-sm)
  - Border: 1px solid gray-200

- `.filters-grid` - Grid layout
  - Grid: 4 columns (desktop)
  - Tablet: 2 columns
  - Mobile: 1 column
  - Gap: 16px

- `.filter-group` - Individual filter group
  - Display: flex (column)
  - Gap: 4px

- `.filter-group label` - Filter label
  - Font-size: 0.75rem
  - Font-weight: 600
  - Text-transform: uppercase
  - Letter-spacing: 0.5px
  - Color: gray-500

- `.filter-select` - Dropdown select
  - Padding: 8px 16px
  - Border: 1px solid gray-300
  - Border-radius: 8px
  - Font-size: 0.875rem
  - Color: gray-700
  - Cursor: pointer
  - Hover: border-color primary-blue with light shadow

- `.search-group` - Search-specific group
  - Desktop: grid-column span 1, at end
  - Tablet: span 2

- `.search-wrapper` - Search input wrapper
  - Position: relative
  - Icon positioned inside (left: 8px, top: 50%)

- `.search-input` - Search input field
  - Width: 100%
  - Padding-left: 32px (for icon)
  - Same styling as select

---

## 11. PAGE HEADER

### Structure
```html
<div class="page-header">
  <div class="header-left">
    <h2>Grant Programs</h2>
    <p class="page-description">Manage all grants...</p>
  </div>
  <div class="header-right">
    <a href="#" class="btn-primary">
      <i class="fas fa-plus"></i>
      <span>New Grant</span>
    </a>
  </div>
</div>
```

### Page Header CSS Classes
- `.page-header` - Main header container
  - Display: flex
  - Justify-content: space-between
  - Align-items: center
  - Margin-bottom: 24px
  - Flex-wrap: wrap
  - Gap: 16px

- `.header-left` - Left section
  - Can have multiple children

- `.header-left h2` - Page title
  - Margin: 0 0 4px 0
  - Font-size: 1.5rem

- `.page-description` - Subtitle/description
  - Color: gray-500
  - Font-size: 0.875rem
  - Margin: 0

- `.header-right` - Right section with action buttons
  - Mobile: width 100% (full width button)

---

## 12. KANBAN BOARD (Applications Page)

### Structure
```html
<div class="kanban-container">
  <div class="kanban-column submitted">
    <div class="column-header">
      <div class="column-title">
        <i class="fas fa-paper-plane"></i>
        <h3>Submitted</h3>
      </div>
      <span class="column-count" id="submittedCount">0</span>
    </div>
    <div class="column-cards" id="submittedColumn">
      <div class="application-card">
        <div class="card-header-section">
          <div class="applicant-info">
            <div class="applicant-avatar">JD</div>
            <div class="applicant-details">
              <h4>John Doe</h4>
              <p class="grant-name-text">SME Grant</p>
            </div>
          </div>
          <span class="score-badge score-high">95</span>
        </div>
        
        <div class="card-details">
          <div class="detail-item">
            <i class="fas fa-calendar"></i>
            <span>2024-03-15</span>
          </div>
        </div>
        
        <div class="card-actions">
          <button class="card-action-btn view-btn">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="card-action-btn approve-btn">
            <i class="fas fa-check"></i> Approve
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Kanban CSS Classes
- `.kanban-container` - Main horizontal scroll container
  - Overflow-x: auto, overflow-y: visible
  - Display: flex
  - Gap: 24px (32px on desktop)
  - Padding: 4px 0 16px 0
  - Scroll-behavior: smooth
  - Custom scrollbar styling

- `.kanban-column` - Individual column
  - Min-width: 320px, width: 320px, flex-shrink: 0
  - Desktop (1024px+): width 340px
  - Tablet (768-1024px): width 300px
  - Mobile (max 480px): width 260px
  - Background: gray-50
  - Border-radius: 12px
  - Display: flex (column)
  - Max-height: calc(100vh - 250px), overflow-y: auto

- `.kanban-column.submitted/.under-review/.approved/.rejected` - Column variants
  - Different color themes for each status

- `.column-header` - Column title section
  - Padding: 16px
  - Background: white
  - Border-radius: 12px 12px 0 0
  - Border-bottom: 2px colored (blue/orange/green/red)
  - Display: flex (space-between)
  - Position: sticky (top: 0, z-index: 10)

- `.column-title` - Title with icon
  - Display: flex
  - Gap: 8px
  - Align-items: center

- `.column-title i` - Status icon (1.25rem, colored)

- `.column-title h3` - Column name
  - Margin: 0
  - Font-size: 1rem
  - Font-weight: 600

- `.column-count` - Badge showing item count
  - Background: gray-200
  - Padding: 2px 8px
  - Border-radius: 12px
  - Font-size: 0.75rem
  - Font-weight: 600
  - Color: gray-700

- `.column-cards` - Cards container
  - Padding: 16px
  - Display: flex (column)
  - Gap: 16px
  - Flex: 1

- `.application-card` - Individual application card
  - Background: white
  - Border-radius: 8px
  - Padding: 16px
  - Box-shadow: var(--shadow-sm)
  - Transition: all var(--transition-fast)
  - Cursor: pointer
  - Animation: slideIn 0.3s ease
  - Hover: translateY(-2px), shadow-md

- `.card-header-section` - Card top section
  - Display: flex
  - Justify-content: space-between
  - Align-items: flex-start
  - Margin-bottom: 16px
  - Gap: 8px

- `.applicant-info` - Applicant name + avatar
  - Display: flex
  - Gap: 8px
  - Flex: 1

- `.applicant-avatar` - Avatar circle
  - Width: 40px, height: 40px (32px on mobile)
  - Border-radius: 50%
  - Blue gradient background
  - White text, centered
  - Font-weight: 600
  - Font-size: 0.875rem (0.75rem on mobile)
  - Flex-shrink: 0

- `.applicant-details` - Name and grant info
  - Flex: 1

- `.applicant-details h4` - Applicant name
  - Margin: 0 0 4px 0
  - Font-size: 0.875rem
  - Font-weight: 600
  - Color: gray-800

- `.grant-name-text` - Grant program name
  - Font-size: 0.75rem
  - Color: gray-500
  - Margin: 0

- `.score-badge` - Score/rating indicator
  - Padding: 4px 8px
  - Border-radius: 6px
  - Font-size: 0.75rem
  - Font-weight: 600
  - White-space: nowrap

- `.score-badge.score-high` - Green score
  - Background: rgba(16, 185, 129, 0.1)
  - Color: success

- `.score-badge.score-medium` - Orange score
  - Background: rgba(245, 158, 11, 0.1)
  - Color: warning

- `.score-badge.score-low` - Red score
  - Background: rgba(239, 68, 68, 0.1)
  - Color: danger

- `.card-details` - Details row (date, etc.)
  - Display: flex
  - Gap: 16px
  - Margin-bottom: 16px
  - Flex-wrap: wrap

- `.detail-item` - Individual detail
  - Display: flex
  - Align-items: center
  - Gap: 4px
  - Font-size: 0.75rem
  - Color: gray-600

- `.card-actions` - Action buttons row
  - Display: flex
  - Gap: 8px
  - Flex-wrap: wrap
  - Mobile: flex-direction column

- `.card-action-btn` - Action button
  - Flex: 1 (fills width when wrapping)
  - Padding: 8px 16px
  - Border: none
  - Border-radius: 6px
  - Font-size: 0.75rem
  - Font-weight: 500
  - Cursor: pointer
  - Display: inline-flex
  - Align-items: center
  - Justify-content: center
  - Gap: 4px
  - Transition: all var(--transition-fast)

- `.view-btn` - View button (gray)
  - Background: gray-100
  - Color: gray-700
  - Hover: gray-200

- `.review-btn` - Review button (blue)
  - Background: rgba(59, 130, 246, 0.1)
  - Color: info
  - Hover: darker blue background

- `.approve-btn` - Approve button (green)
  - Background: rgba(16, 185, 129, 0.1)
  - Color: success
  - Hover: darker green background

- `.reject-btn` - Reject button (red)
  - Background: rgba(239, 68, 68, 0.1)
  - Color: danger
  - Hover: darker red background

- `.empty-column` - Empty state message
  - Text-align: center
  - Padding: 32px 16px
  - Color: gray-400
  - Font-size: 0.875rem
  - Background: white
  - Border-radius: 8px
  - Border: 2px dashed gray-200

---

## 13. MODALS

### Structure
```html
<div class="custom-modal-overlay" id="modalOverlay">
  <div class="custom-modal">
    <div class="custom-modal-header">
      <h3>Modal Title</h3>
      <button class="custom-modal-close" id="closeBtn">&times;</button>
    </div>
    <div class="custom-modal-body">
      <!-- Content -->
    </div>
    <div class="custom-modal-footer">
      <button class="custom-modal-btn btn-secondary">Cancel</button>
      <button class="custom-modal-btn btn-primary">Save</button>
    </div>
  </div>
</div>
```

### Modal CSS Classes
- `.custom-modal-overlay` - Overlay background
  - Position: fixed (inset: 0)
  - Background: rgba(0, 0, 0, 0.5)
  - Display: flex
  - Align-items: center, justify-content: center
  - Z-index: 3000
  - Opacity: 1, visibility: visible
  - Transition: opacity and visibility

- `.custom-modal-overlay.hidden` - Hidden state
  - Opacity: 0, visibility: hidden
  - Pointer-events: none

- `.custom-modal` - Modal box
  - Width: min(95%, 480px)
  - Background: white
  - Border-radius: 12px
  - Box-shadow: var(--shadow-xl)
  - Overflow: hidden
  - Transform: translateY(-10px)
  - Transition: transform var(--transition-fast)
  - Animation plays on show

- `.custom-modal-header` - Header section
  - Display: flex
  - Justify-content: space-between
  - Align-items: center
  - Padding: 16px
  - Border-bottom: 1px solid gray-200
  - Background: gray-50

- `.custom-modal-header h3` - Title
  - Margin: 0
  - Font-size: 1.125rem

- `.custom-modal-close` - Close button
  - Border: none
  - Background: transparent
  - Font-size: 1.5rem
  - Line-height: 1
  - Cursor: pointer
  - Color: gray-600

- `.custom-modal-body` - Body content
  - Padding: 16px
  - Font-size: 0.95rem
  - Color: gray-700
  - White-space: pre-wrap

- `.custom-modal-footer` - Footer with buttons
  - Display: flex
  - Justify-content: flex-end
  - Padding: 16px
  - Gap: 8px
  - Border-top: 1px solid gray-200
  - Background: gray-50

- `.custom-modal-btn` - Modal button
  - Border-radius: 6px
  - Border: 1px transparent
  - Cursor: pointer
  - Padding: 4px 16px
  - Font-size: 0.875rem
  - Font-weight: 600
  - Transition: all var(--transition-fast)
  - Hover: translateY(-1px)

---

## 14. EMPTY STATE

### Structure
```html
<div class="empty-state">
  <i class="fas fa-inbox"></i>
  <h3>No grants found</h3>
  <p>Try adjusting your filters or create a new grant</p>
  <a href="#" class="btn-secondary">Create New Grant</a>
</div>
```

### Empty State CSS Classes
- `.empty-state` - Main container
  - Display: flex (column)
  - Align-items: center
  - Justify-content: center
  - Text-align: center
  - Padding: 48px 16px

- `.empty-state i` - Icon
  - Font-size: 4rem
  - Color: gray-300
  - Margin-bottom: 16px

- `.empty-state h3` - Title
  - Margin: 0 0 4px 0
  - Color: gray-700

- `.empty-state p` - Description
  - Color: gray-500
  - Margin-bottom: 24px

---

## 15. FORMS

### Structure
```html
<div class="form-group">
  <label for="fieldId">Field Label</label>
  <input type="text" id="fieldId" class="form-input" placeholder="Enter value...">
</div>

<div class="form-row">
  <div class="form-group"><!-- Left column --> </div>
  <div class="form-group"><!-- Right column --> </div>
</div>
```

### Form CSS Classes
- `.form-group` - Individual form field
  - Margin-bottom: 16px (or 24px in modals)
  - Width: 100%

- `.form-group label` - Label text
  - Display: block
  - Margin-bottom: 4px (or 8px)
  - Font-weight: 500
  - Color: gray-700
  - Font-size: 0.875-0.9rem

- `.form-input`, `.form-select`, `.form-textarea` - Input fields
  - Width: 100%
  - Padding: 8px 16px
  - Border: 1px solid gray-300
  - Border-radius: 8px
  - Font-size: 0.875-0.95rem
  - Font-family: inherit
  - Background: white
  - Transition: all var(--transition-fast)
  - Focus: border-color primary-blue, shadow box-shadow

- `.form-textarea` - Textarea specifically
  - Resize: vertical
  - Min-height: 100px

- `.form-row` - Multi-column row
  - Display: grid
  - Grid-template-columns: 1fr 1fr (desktop)
  - Gap: 16px
  - Mobile: grid-template-columns: 1fr (single column)

- `.checkbox-label` - Checkbox wrapper
  - Display: flex
  - Align-items: center
  - Gap: 8px
  - Cursor: pointer
  - Padding: 8px
  - Border-radius: 6px
  - Hover: background gray-50

- `.checkbox-label input[type="checkbox"]` - Checkbox input
  - Width: 18px
  - Height: 18px
  - Cursor: pointer
  - Accent-color: primary-blue

---

## 16. COLOR & STATUS PATTERNS

### Status Badge Colors
| Status | Color | Background |
|--------|-------|------------|
| Active / Success | #10b981 | rgba(16, 185, 129, 0.1) |
| Under Review / Warning | #f59e0b | rgba(245, 158, 11, 0.1) |
| Rejected / Danger | #ef4444 | rgba(239, 68, 68, 0.1) |
| Submitted / Info | #3b82f6 | rgba(59, 130, 246, 0.1) |

### Icon & Background Gradients
- Primary (Blue): `linear-gradient(135deg, #1a56db, #1e429f)`
- Allocated (Orange): `linear-gradient(135deg, #f59e0b, #d97706)`
- Remaining (Green): `linear-gradient(135deg, #10b981, #059669)`

---

## 17. RESPONSIVE BREAKPOINTS

### Desktop (1024px+)
- Full sidebar (280px)
- 3-column stats grid
- 4-column filter grid
- 340px wide kanban columns
- Max content width: 1400px

### Tablet (768px - 1024px)
- Sidebar sliding drawer (shown on toggle)
- 2-column filter grid
- 3-column stats grid (sometimes)
- 300px wide kanban columns
- Content padding: 16px

### Mobile (max 768px)
- Sidebar hidden by default, slides from left
- Sidebar overlay backdrop
- Full-width buttons
- 1-column filter grid
- Stack stat cards vertically
- 280px wide kanban columns
- Smaller fonts and padding

### Small Mobile (max 480px)
- 260px wide kanban columns
- Minimal padding (8px)
- Smaller font sizes
- Reduced icon sizes
- Simplified layouts

---

## 18. KEY DESIGN PATTERNS

### Pattern 1: Card with Header and Body
```html
<div class="card">
  <div class="card-header">
    <h2>Title</h2>
    <link class="view-all">View All</link>
  </div>
  <div class="card-body">
    <!-- Content with horizontal scroll -->
  </div>
</div>
```

### Pattern 2: Sidebar + Topbar + Content
```html
<div class="app-container">
  <aside class="sidebar"></aside>
  <main class="main-content">
    <header class="topbar"></header>
    <div class="content-wrapper"></div>
  </main>
</div>
```

### Pattern 3: Stat Cards Grid
```html
<div class="stats-grid">
  <!-- Responsive: 1 col mobile → 3 cols desktop -->
  <div class="stat-card">
    <div class="stat-icon"> <!-- Colored gradient --> </div>
    <div class="stat-info">
      <h3>Label</h3>
      <p class="stat-value">Value</p>
      <span class="stat-trend positive/neutral/negative"></span>
    </div>
  </div>
</div>
```

### Pattern 4: Filter + Table
```html
<div class="filters-card">
  <!-- 4 col grid (desktop) with selects/search -->
</div>
<div class="card">
  <div class="card-header"><h2>Title</h2></div>
  <div class="table-responsive">
    <table class="data-table"></table>
  </div>
</div>
```

### Pattern 5: Kanban Board (Horizontal Scroll)
```html
<div class="kanban-container">
  <div class="kanban-column submitted/under-review/approved/rejected">
    <div class="column-header"></div>
    <div class="column-cards">
      <div class="application-card"></div>
    </div>
  </div>
</div>
```

---

## 19. NAMING CONVENTIONS SUMMARY

### CSS Naming (BEM-inspired)
- Components: `.component-name`
- States: `.component-name.state` (e.g., `.nav-item.active`)
- Variants: `.component-name.variant` (e.g., `.stat-icon.allocated`)
- Children: `.parent-child` (e.g., `.stat-icon`, `.card-body`)

### Common Patterns
- Icons: Font Awesome 6.4.0
- Transitions: All use CSS variables (`var(--transition-fast/base/slow)`)
- Shadows: Predefined shadow variables for depth
- Colors: Limited palette using CSS variables
- Spacing: Consistent 8px grid system

### Component Organization
1. Layout containers (sidebar, topbar, main-content)
2. Content sections (cards, stats, tables)
3. Interactive elements (buttons, badges, modals)
4. Utility classes (responsive, positioning)

---

## 20. FILE-SPECIFIC STRUCTURE

### index.html (Dashboard)
- Stats Grid (3 stat cards)
- Funds Overview Chart Card
- Active Grants Table Card
- Recent Applications Table Card

### grants.html (Grants List)
- Page Header (title + create button)
- Filters Card (status, category, date, search)
- Grants Table Card (filterable, sortable)
- Empty State (when no results)

### applications.html (Applications)
- Page Header with stats badge
- Kanban Board (4 columns: Submitted, Under Review, Approved, Rejected)
- Application Cards (with avatar, score, details, actions)

---

## 21. RESPONSIVE CLASSES USAGE

### Mobile Menu Classes
- `.sidebar.open` - Show sidebar on mobile
- `.mobile-menu-btn` - Mobile-only hamburger (hidden on desktop)
- `.sidebar-overlay` - Mobile backdrop (shown when sidebar open)
- `.sidebar-toggle` - Mobile sidebar close button (hidden on desktop)

### Responsive Text
- Page titles: Reduce from 1.75rem → 1.5rem → 1.25rem (desktop to small mobile)
- Card titles: Reduce from 1.25rem → 1rem → 0.875rem
- Table text: Scale from 0.875rem → 0.75rem

---

## Summary

The admin dashboard uses a **modern, clean design** with:

✓ **Consistent color scheme** - Blue primary, green success, orange warning, red danger
✓ **8px grid system** - All spacing follows multiples of 8px
✓ **Component-based structure** - Reusable cards, badges, buttons, tables
✓ **Mobile-first responsive** - Adapts gracefully from 320px to 1400px+
✓ **Accessible interactions** - Focus states, hover effects, transitions
✓ **Hierarchy through typography** - Clear size/weight differences
✓ **Shadow depth** - Multiple shadow levels for visual hierarchy
✓ **Interactive feedback** - Transitions on all interactive elements (150ms-350ms)
