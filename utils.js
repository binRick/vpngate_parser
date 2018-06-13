module.exports = {
    countryList: (obj) => {
        const countries = [];
        for (const i in obj) {
            countries.push(obj[i].CountryShort);
        }

        function unique(arr) {
            const obj = {};
            for (const i in countries) {
                const str = arr[i];
                obj[str] = true;
            }
            return Object.keys(obj);
        }
        return unique(countries);
    },
};