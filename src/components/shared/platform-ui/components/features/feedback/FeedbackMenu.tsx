import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, History as HistoryIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isDesktop, openExternal } from '../../../platform';

interface FeedbackMenuProps {
  reportIssueUrl?: string;
  feedbackRecordsUrl?: string;
  onReportIssue?: () => void;
  onFeedbackRecords?: () => void;
}

export function FeedbackMenu({
  reportIssueUrl,
  feedbackRecordsUrl,
  onReportIssue,
  onFeedbackRecords
}: FeedbackMenuProps) {
  const [showFeedbackMenu, setShowFeedbackMenu] = useState(false);
  const feedbackMenuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('common');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (feedbackMenuRef.current && !feedbackMenuRef.current.contains(event.target as Node)) {
        setShowFeedbackMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAbsoluteUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
  };

  const openAbsoluteFeedback = (url: string) => {
    const u = url.startsWith('//') ? `${window.location.protocol}${url}` : url;
    if (isDesktop()) {
      openExternal(u);
    } else {
      window.location.href = u;
    }
  };

  const handleReportIssue = () => {
    setShowFeedbackMenu(false);
    if (onReportIssue) {
      onReportIssue();
    } else if (reportIssueUrl) {
      if (isAbsoluteUrl(reportIssueUrl)) {
        openAbsoluteFeedback(reportIssueUrl);
      }
    }
  };

  const handleFeedbackRecords = () => {
    setShowFeedbackMenu(false);
    if (onFeedbackRecords) {
      onFeedbackRecords();
    } else if (feedbackRecordsUrl) {
      if (isAbsoluteUrl(feedbackRecordsUrl)) {
        openAbsoluteFeedback(feedbackRecordsUrl);
      }
    }
  };

  return (
    <div className="relative hidden md:block" ref={feedbackMenuRef}>
      <button
        onClick={() => setShowFeedbackMenu(!showFeedbackMenu)}
        className="p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 transition-all duration-300"
        title={t('header.report_issue', 'Feedback')}
      >
        <AlertCircle className="w-5 h-5" />
      </button>

      {showFeedbackMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-surface dark:bg-surface-dark border border-surface-darker/10 dark:border-surface-darker/20 rounded-lg shadow-xl z-[200] overflow-hidden animate-fadeIn">
          <div className="p-2">
            {reportIssueUrl ? (
              isAbsoluteUrl(reportIssueUrl) ? (
                <button
                  onClick={handleReportIssue}
                  className="w-full p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 flex items-center justify-between transition-colors duration-300"
                >
                  <span className="text-sm">{t('header.report_issue_menu', 'Report Issue')}</span>
                  <AlertCircle className="w-5 h-5" />
                </button>
              ) : (
                <Link
                  to={reportIssueUrl}
                  className="w-full p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 flex items-center justify-between transition-colors duration-300"
                  onClick={() => setShowFeedbackMenu(false)}
                >
                  <span className="text-sm">{t('header.report_issue_menu', 'Report Issue')}</span>
                  <AlertCircle className="w-5 h-5" />
                </Link>
              )
            ) : onReportIssue ? (
              <button
                onClick={handleReportIssue}
                className="w-full p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 flex items-center justify-between transition-colors duration-300"
              >
                <span className="text-sm">{t('header.report_issue_menu', 'Report Issue')}</span>
                <AlertCircle className="w-5 h-5" />
              </button>
            ) : null}

            {feedbackRecordsUrl ? (
              isAbsoluteUrl(feedbackRecordsUrl) ? (
                <button
                  onClick={handleFeedbackRecords}
                  className="w-full p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 flex items-center justify-between transition-colors duration-300"
                >
                  <span className="text-sm">{t('header.feedback_records', 'Feedback Records')}</span>
                  <HistoryIcon className="w-5 h-5" />
                </button>
              ) : (
                <Link
                  to={feedbackRecordsUrl}
                  className="w-full p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 flex items-center justify-between transition-colors duration-300"
                  onClick={() => setShowFeedbackMenu(false)}
                >
                  <span className="text-sm">{t('header.feedback_records', 'Feedback Records')}</span>
                  <HistoryIcon className="w-5 h-5" />
                </Link>
              )
            ) : onFeedbackRecords ? (
              <button
                onClick={handleFeedbackRecords}
                className="w-full p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 flex items-center justify-between transition-colors duration-300"
              >
                <span className="text-sm">{t('header.feedback_records', 'Feedback Records')}</span>
                <HistoryIcon className="w-5 h-5" />
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
