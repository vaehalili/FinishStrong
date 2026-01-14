import { writable, get } from 'svelte/store';

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  return getLocalDateString(new Date());
}

function createViewingDateStore() {
  const { subscribe, set, update } = writable(getTodayString());

  return {
    subscribe,
    set,
    goToPreviousDay: () => {
      update((current) => {
        const date = new Date(current + 'T00:00:00');
        date.setDate(date.getDate() - 1);
        return getLocalDateString(date);
      });
    },
    goToNextDay: () => {
      update((current) => {
        const date = new Date(current + 'T00:00:00');
        date.setDate(date.getDate() + 1);
        return getLocalDateString(date);
      });
    },
    goToToday: () => {
      set(getTodayString());
    },
    goToDate: (dateString: string) => {
      set(dateString);
    },
    isToday: () => {
      return get({ subscribe }) === getTodayString();
    },
    getDisplayDate: () => {
      return get({ subscribe });
    }
  };
}

export const viewingDate = createViewingDateStore();
export { getLocalDateString, getTodayString };
