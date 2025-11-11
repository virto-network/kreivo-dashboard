import React from 'react';
import { useCommunities } from '@/hooks/useCommunities';
import './Communities.css';

const Communities: React.FC = () => {
  const { communities, isLoading, error } = useCommunities();

  const getGradient = (id: number) => {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];
    return gradients[id % gradients.length];
  };

  const getIndicator = (id: number) => {
    const indicators = ['#10b981', '#3b82f6', '#fbbf24', '#ef4444', '#8b5cf6', '#06b6d4'];
    return indicators[id % indicators.length];
  };

  const formatMembers = (members: number) => {
    if (!members) return '0 members';
    if (members >= 1000) {
      return `${(members / 1000).toFixed(1)}k members`;
    }
    return `${members} members`;
  };

  return (
    <div className="communities-page">
      <div className="communities-header">
        <h1 className="communities-title">Communities</h1>
        <button className="add-community-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="communities-loading">Loading communities...</div>
      ) : error ? (
        <div className="communities-error">Error: {error}</div>
      ) : communities.length === 0 ? (
        <div className="communities-empty">No communities found</div>
      ) : (
        <div className="communities-list">
          {communities.map((community) => (
            <div key={community.id} className="communities-item">
              <div 
                className="communities-logo" 
                style={{ background: getGradient(community.id) }}
              ></div>
              <div className="communities-info">
                <div className="communities-name">
                  {community.name}
                </div>
                <div className="communities-members">
                  {formatMembers(community.members)}
                </div>
              </div>
              <div 
                className="communities-indicator" 
                style={{ backgroundColor: getIndicator(community.id) }}
              ></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Communities;

