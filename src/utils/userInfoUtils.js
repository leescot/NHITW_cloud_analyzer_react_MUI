/**
 * Extract user information from JWT token
 * @returns {Object|null} User information object or null if not available
 */
export const extractUserInfoFromToken = () => {
    try {
        // Try to get token from window (set by legacyContent.js)
        let token = null;

        // Method 1: Try to get from session storage
        const possibleTokenNames = [
            "jwt_token",
            "token",
            "access_token",
            "auth_token",
        ];

        for (const name of possibleTokenNames) {
            try {
                const storageToken = sessionStorage.getItem(name);
                if (storageToken) {
                    token = storageToken.startsWith("Bearer ")
                        ? storageToken.slice(7)
                        : storageToken;
                    break;
                }
            } catch (error) {
                console.log("Could not access sessionStorage:", error);
            }
        }

        if (!token) {
            return null;
        }

        // Decode JWT token with proper UTF-8 support for Chinese characters
        const parts = token.split(".");
        if (parts.length !== 3) {
            return null;
        }

        // Properly decode Base64 to UTF-8
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const payload = JSON.parse(jsonPayload);

        // Extract user information from the token
        // UserName: Patient name (病患姓名)
        // UserID: Patient ID / National ID (身份證號)
        // HPCCName: Healthcare provider card name (醫事人員卡姓名) - DO NOT use as patient name
        const name = payload.UserName || "";
        const userId = payload.UserID || "";
        const gender = payload.UserSex || "";
        const birthday = payload.UserBirthday || "";

        // Calculate age from birthday if available
        let age = null;
        if (birthday) {
            // Birthday format is ROC (Taiwan calendar): YYYMMDD (7 digits)
            // Example: "0660329" = ROC year 66, month 03, day 29 = 1977-03-29
            if (birthday.length === 7) {
                const rocYear = parseInt(birthday.substring(0, 3), 10);
                const month = parseInt(birthday.substring(3, 5), 10);
                const day = parseInt(birthday.substring(5, 7), 10);

                // Convert ROC year to AD year
                const adYear = rocYear + 1911;

                const birthDate = new Date(adYear, month - 1, day);
                const today = new Date();

                age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();

                if (
                    monthDiff < 0 ||
                    (monthDiff === 0 && today.getDate() < birthDate.getDate())
                ) {
                    age--;
                }
            }
        }

        return {
            name,
            userId,
            gender,
            birthday,
            age,
        };
    } catch (error) {
        console.error("Error extracting user info from token:", error);
        return null;
    }
};

/**
 * Format user information for display
 * @param {Object} userInfo - User information object
 * @returns {string} Formatted string like "李坤峰(48M)" or "A123456789(M)" or empty string
 */
export const formatUserInfoDisplay = (userInfo) => {
    if (!userInfo) {
        return "";
    }

    const { name, userId, gender, age } = userInfo;

    // Determine display name: use name if available, otherwise use userId
    let displayName = "";

    if (name) {
        // Display full name
        displayName = name;
    } else if (userId) {
        // Use UserID as fallback
        displayName = userId;
    } else {
        // No name or userId available
        return "";
    }

    // Format: "姓名(歲數性別)" or "UserID(歲數性別)" or "姓名(性別)" or "UserID(性別)"
    const parts = [];
    if (age !== null) {
        parts.push(age.toString());
    }
    if (gender) {
        parts.push(gender);
    }

    if (parts.length > 0) {
        return `${displayName}(${parts.join("")})`;
    }

    return displayName;
};
