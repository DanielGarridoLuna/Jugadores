// utils/storage.js
export const storage = {
    setItem: (key, value) => {
        try {
            window.localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`localStorage failed, falling back to sessionStorage for key "${key}"`);
            try {
                window.sessionStorage.setItem(key, value);
                return true;
            } catch (e2) {
                console.error(`Failed to save to sessionStorage as well.`, e2);
                return false;
            }
        }
    },
    getItem: (key) => {
        try {
            let value = window.localStorage.getItem(key);
            if (value !== null) return value;
        } catch (e) { }

        try {
            return window.sessionStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    removeItem: (key) => {
        try {
            window.localStorage.removeItem(key);
        } catch (e) { }
        try {
            window.sessionStorage.removeItem(key);
        } catch (e) { }
    }
};