/**
 * Timezone and date formatting utilities
 */

export const formatRefundDeadline = (date: string | Date, timezone: string = 'UTC'): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting refund deadline:', error);
    return 'Invalid date';
  }
};

export const getTimeRemainingString = (deadline: string | Date): string => {
  try {
    const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
    const now = new Date();

    if (isNaN(deadlineDate.getTime())) {
      return 'Invalid deadline';
    }

    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Expired';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
    } else {
      return 'Less than a minute remaining';
    }
  } catch (error) {
    console.error('Error calculating time remaining:', error);
    return 'Unable to calculate';
  }
};

export const formatEventDate = (date: string | Date | null | undefined, timezone: string = 'UTC'): string => {
  try {
    if (!date) {
      return 'Date not available';
    }
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting event date:', error);
    return 'Invalid date';
  }
};

export const formatEventTime = (date: string | Date | null | undefined, timezone: string = 'UTC'): string => {
  try {
    if (!date) {
      return 'Time not available';
    }
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid time';
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting event time:', error);
    return 'Invalid time';
  }
};

export const isEventActive = (startDate: string | Date, endDate?: string | Date): boolean => {
  try {
    const now = new Date();
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : null;

    if (isNaN(start.getTime())) {
      return false;
    }

    const hasStarted = now >= start;
    const hasEnded = end ? now > end : false;

    return hasStarted && !hasEnded;
  } catch (error) {
    console.error('Error checking if event is active:', error);
    return false;
  }
};

export const getTimeUntilEvent = (eventDate: string | Date): string => {
  try {
    const eventDateObj = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
    const now = new Date();

    if (isNaN(eventDateObj.getTime())) {
      return 'Invalid date';
    }

    const diffMs = eventDateObj.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Event has started';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `Starts in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Starts in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `Starts in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'Starting soon';
    }
  } catch (error) {
    console.error('Error calculating time until event:', error);
    return 'Unable to calculate';
  }
};

export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return formatEventDate(dateObj);
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
};
