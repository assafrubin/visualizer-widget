import type { QuickAction } from '../../types'

interface QuickActionsPanelProps {
  actions: QuickAction[]
  isLoadingActions: boolean
  action: QuickAction | null
  refinement: string
  onSelectAction: (action: QuickAction) => void
  onRefinementChange: (text: string) => void
}

export function QuickActionsPanel({ actions, isLoadingActions, action, refinement, onSelectAction, onRefinementChange }: QuickActionsPanelProps) {
  return (
    <div className="quick-actions-panel">
      <div className="action-list">
        {isLoadingActions ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--vir-muted, #888)', fontSize: 13 }}>
            <span className="vir-spinner vir-spinner--dark" style={{ width: 14, height: 14 }} />
            Analysing your room…
          </div>
        ) : actions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--vir-muted, #888)', padding: '8px 0' }}>
            No placement options available.
          </p>
        ) : (
          actions.map(a => (
            <button
              key={a.id}
              className={`action-option ${action?.id === a.id ? 'action-option--selected' : ''}`}
              onClick={() => onSelectAction(a)}
            >
              <span className="action-option__radio">
                {action?.id === a.id ? '●' : '○'}
              </span>
              <span className="action-option__icon">{a.icon}</span>
              <span className="action-option__label">{a.label}</span>
              {action?.id === a.id && (
                <span className="action-option__check">✓</span>
              )}
            </button>
          ))
        )}
      </div>

      <div className="refinement-input">
        <label className="refinement-input__label" htmlFor="vir-refinement">
          Anything else we should keep in mind?
          <span className="refinement-input__optional">Optional</span>
        </label>
        <input
          id="vir-refinement"
          type="text"
          className="refinement-input__field"
          placeholder="e.g. Keep it aligned with the TV"
          value={refinement}
          onChange={e => onRefinementChange(e.target.value)}
          maxLength={120}
        />
      </div>
    </div>
  )
}
