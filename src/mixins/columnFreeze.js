/**
 * 列冻结 + 列宽调整 mixin
 *   - 默认冻结第一列，列头悬浮出现锁图标，点击切换冻结/取消
 *   - 列头右侧边缘悬浮出现拖拽手柄，拖拽调整列宽，双击自适应列宽
 *
 * 使用方式：
 *   1. import columnFreeze from '@/mixins/columnFreeze'
 *   2. mixins: [columnFreeze]
 *   3. 模板中 :columns="displayColumns" 替换 :columns="columns"
 */
export default {
  data () {
    return {
      /** 冻结前 N 列，0 = 不冻结 */
      frozenColCount: 1,
      /** 用户调整后的列宽 { colKey: number } */
      columnWidths: {}
    }
  },
  computed: {
    /**
     * 根据 frozenColCount / columnWidths 动态生成列定义。
     * 注入 customHeaderCell：锁图标 + 拖拽手柄。
     */
    displayColumns () {
      const cols = this.columns || []
      const frozenCount = this.frozenColCount || 0
      const vm = this

      return cols.map((col, idx) => {
        const base = { ...col }

        // 操作列 fixed: 'right' 不动
        if (base.fixed === 'right') return base

        // 冻结列设置 fixed: 'left'
        if (idx < frozenCount) {
          base.fixed = 'left'
        } else if (base.fixed === 'left') {
          delete base.fixed
        }

        // 应用用户自定义列宽
        const colKey = vm.getColumnKey(col, idx)
        if (vm.columnWidths[colKey]) {
          base.width = vm.columnWidths[colKey]
        }

        // 注入 customHeaderCell：锁图标 + 拖拽手柄
        const original = base.customHeaderCell
        base.customHeaderCell = (column) => {
          const origProps = original ? original(column) : {}
          return {
            ...origProps,
            style: { ...(origProps.style || {}), position: 'relative' },
            on: {
              ...(origProps.on || {}),
              mouseenter (e) {
                vm.onHeaderEnter(e.currentTarget, idx)
              },
              mouseleave (e) {
                vm.onHeaderLeave(e.currentTarget, idx)
              }
            }
          }
        }

        return base
      })
    }
  },
  methods: {
    // ==================== 列键 ====================

    getColumnKey (col, idx) {
      return col.dataIndex || col.key || `_col_${idx}`
    },

    // ==================== 锁图标 ====================

    toggleFreeze (colIndex) {
      if (colIndex + 1 === this.frozenColCount) {
        this.frozenColCount = 0
      } else {
        this.frozenColCount = colIndex + 1
      }
      this.$nextTick(() => this.syncLockIcons())
    },

    onHeaderEnter (th, colIndex) {
      this.ensureLockIcon(th, colIndex)
      this.ensureResizeHandle(th, colIndex)
      const icon = th.querySelector('.col-freeze-icon')
      if (icon) {
        icon.style.display = ''
        this.updateIconState(icon, colIndex)
      }
    },

    onHeaderLeave (th, colIndex) {
      if (colIndex >= this.frozenColCount) {
        const icon = th.querySelector('.col-freeze-icon')
        if (icon) icon.style.display = 'none'
      }
    },

    ensureLockIcon (th, colIndex) {
      let icon = th.querySelector('.col-freeze-icon')
      if (!icon) {
        icon = document.createElement('span')
        icon.className = 'col-freeze-icon'
        icon.dataset.colIndex = colIndex
        icon.addEventListener('click', (e) => {
          e.stopPropagation()
          this.toggleFreeze(colIndex)
        })
        th.appendChild(icon)
      }
      return icon
    },

    updateIconState (icon, colIndex) {
      const frozen = colIndex < this.frozenColCount
      icon.textContent = frozen ? '🔒' : '🔓'
      icon.title = frozen ? '点击取消冻结' : '点击冻结至此列'
      icon.classList.toggle('is-frozen', frozen)
    },

    syncLockIcons () {
      const icons = document.querySelectorAll('.col-freeze-icon')
      icons.forEach(icon => {
        const idx = parseInt(icon.dataset.colIndex)
        if (isNaN(idx)) return
        this.updateIconState(icon, idx)
        icon.style.display = (idx < this.frozenColCount) ? '' : 'none'
      })
    },

    // ==================== 列宽拖拽 ====================

    ensureResizeHandle (th, colIndex) {
      let handle = th.querySelector('.col-resize-handle')
      if (!handle) {
        handle = document.createElement('div')
        handle.className = 'col-resize-handle'
        handle.addEventListener('mousedown', (e) => this.onResizeStart(e, colIndex, th))
        handle.addEventListener('dblclick', (e) => this.onResizeDblClick(e, colIndex))
        th.appendChild(handle)
      }
      return handle
    },

    onResizeStart (e, colIndex, th) {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startWidth = th.getBoundingClientRect().width
      const colKey = this.getColumnKey(this.columns[colIndex], colIndex)
      let currentWidth = startWidth

      this._resizing = { colIndex, colKey, startX, startWidth, th }

      const onMove = (ev) => {
        if (!this._resizing) return
        const delta = ev.clientX - this._resizing.startX
        currentWidth = Math.max(50, this._resizing.startWidth + delta)
        this.applyColumnWidthDOM(colIndex, currentWidth)
      }

      const onUp = () => {
        if (this._resizing) {
          this.$set(this.columnWidths, this._resizing.colKey, currentWidth)
          this._resizing = null
        }
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },

    /** 拖拽过程中直接更新 DOM（避免频繁触发 Vue 重渲染） */
    applyColumnWidthDOM (colIndex, width) {
      const table = this.$el
      if (!table) return

      // 更新所有表头中对应列的 th
      const allThs = table.querySelectorAll('.ant-table-thead th')
      this._forEachNthChild(allThs, colIndex, (th) => {
        th.style.minWidth = width + 'px'
        th.style.width = width + 'px'
      })

      // 更新所有表体中对应列的 td
      const allTds = table.querySelectorAll('.ant-table-tbody tr:not(.ant-table-measure-row)')
      allTds.forEach(row => {
        const cells = row.querySelectorAll('td')
        if (cells[colIndex]) {
          cells[colIndex].style.minWidth = width + 'px'
          cells[colIndex].style.width = width + 'px'
        }
      })
    },

    /** 在包含 fixed 列的表格中，按列索引找到对应 th（fixed 列会渲染在独立 table 里） */
    _forEachNthChild (nodeList, colIndex, fn) {
      // 简单场景：直接按索引取
      // 复杂场景（fixed 列）：需要遍历所有 table 拼接出完整列序
      if (nodeList.length === 0) return

      // 尝试直接按索引
      if (colIndex < nodeList.length) {
        fn(nodeList[colIndex])
        return
      }

      // fixed 列场景：遍历所有 .ant-table 找到完整的列序
      const tableRoot = this.$el.querySelector('.ant-table')
      if (!tableRoot) return
      const allThs = tableRoot.querySelectorAll('.ant-table-thead th')
      if (colIndex < allThs.length) {
        fn(allThs[colIndex])
      }
    },

    // ==================== 双击自适应列宽 ====================

    onResizeDblClick (e, colIndex) {
      e.preventDefault()
      e.stopPropagation()

      const colKey = this.getColumnKey(this.columns[colIndex], colIndex)
      const autoWidth = this.measureColumnWidth(colIndex)
      if (autoWidth > 0) {
        this.$set(this.columnWidths, colKey, autoWidth)
      }
    },

    measureColumnWidth (colIndex) {
      const col = this.columns[colIndex]
      if (!col) return 0

      // 使用隐藏的测量元素（比 scrollWidth 更准确，不受当前列宽限制）
      const measure = document.createElement('span')
      measure.style.cssText =
        'position:absolute;visibility:hidden;white-space:nowrap;' +
        'font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
      document.body.appendChild(measure)

      let maxWidth = 0

      // 测量列头
      measure.textContent = (typeof col.title === 'string') ? col.title : ''
      maxWidth = measure.offsetWidth

      // 测量表体采样行（最多 30 行）
      const tableRoot = this.$el.querySelector('.ant-table')
      if (tableRoot) {
        const rows = tableRoot.querySelectorAll('.ant-table-tbody tr:not(.ant-table-measure-row)')
        const limit = Math.min(rows.length, 30)
        for (let i = 0; i < limit; i++) {
          const cells = rows[i].querySelectorAll('td')
          if (cells[colIndex]) {
            measure.textContent = (cells[colIndex].textContent || '').trim()
            const w = measure.offsetWidth
            if (w > maxWidth) maxWidth = w
          }
        }
      }

      document.body.removeChild(measure)
      return Math.min(maxWidth + 28, 600) // padding + 排序图标，上限 600px
    },

    // ==================== 样式注入 ====================

    injectFreezeStyles () {
      if (document.getElementById('col-freeze-styles')) return
      const style = document.createElement('style')
      style.id = 'col-freeze-styles'
      style.textContent = `
        .col-freeze-icon {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          font-size: 11px;
          opacity: 0.45;
          transition: opacity 0.15s;
          user-select: none;
          z-index: 1;
          line-height: 1;
        }
        .col-freeze-icon:hover,
        .col-freeze-icon.is-frozen {
          opacity: 1;
        }
        .col-resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          cursor: col-resize;
          z-index: 2;
        }
        .col-resize-handle:hover {
          background: rgba(0, 0, 0, 0.06);
        }
        .col-resize-handle:active {
          background: rgba(24, 144, 255, 0.12);
        }
      `
      document.head.appendChild(style)
    }
  },
  mounted () {
    this.injectFreezeStyles()
  }
}