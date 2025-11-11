import React from 'react';
import { useInitiatives } from '@/hooks/useInitiatives';
import './Initiatives.css';

const Initiatives: React.FC = () => {
  const { initiatives, isLoading, error } = useInitiatives(1); // Community ID 1

  const getProgressColor = (progress: number) => {
    if (progress < 50) {
      return '#ef4444'; // red
    } else if (progress < 80) {
      return '#fbbf24'; // yellow
    }
    return '#10b981'; // green
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: '#3b82f6',
      completed: '#10b981',
      pending: '#fbbf24',
    };
    return statusColors[status] || '#6b7280';
  };

  return (
    <div className="initiatives-page">
      <div className="initiatives-header">
        <h1 className="initiatives-title">Acme DAO Initiatives</h1>
      </div>

      {isLoading ? (
        <div className="initiatives-loading">Loading initiatives...</div>
      ) : error ? (
        <div className="initiatives-error">Error: {error}</div>
      ) : initiatives.length === 0 ? (
        <div className="initiatives-empty">No initiatives found</div>
      ) : (
        <div className="initiatives-list">
          {initiatives.map((initiative) => (
            <div key={initiative.id} className="initiatives-item">
              <div className="initiatives-item-header">
                <div className="initiatives-item-title">{initiative.name}</div>
                <div 
                  className="initiatives-status-badge"
                  style={{ backgroundColor: getStatusBadge(initiative.status) }}
                >
                  {initiative.status}
                </div>
              </div>
              <div className="initiatives-progress-section">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${initiative.progress}%`, 
                      backgroundColor: getProgressColor(initiative.progress)
                    }}
                  ></div>
                </div>
                <div className="initiatives-progress-info">
                  <span className="progress-percentage">{initiative.progress}%</span>
                  {initiative.ayes !== undefined && initiative.nays !== undefined && (
                    <span className="progress-votes">
                      {initiative.ayes} ayes / {initiative.nays} nays
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Initiatives;

