import { useEffect } from 'react';

const SITE_NAME = 'NexusQuest';

export function usePageTitle(pageTitle: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = pageTitle ? `${pageTitle} | ${SITE_NAME}` : SITE_NAME;
    
    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);
}
