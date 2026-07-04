import re

with open("components/InventoryDashboard.tsx", "r") as f:
    content = f.read()

search = """    const tableData = useMemo(() => {
        let data = inventory.filter(item =>
            (item.itemName && item.itemName.toLowerCase().includes(searchTerm?.toLowerCase() || '')) ||
            (item.itemCategory && item.itemCategory.toLowerCase().includes(searchTerm?.toLowerCase() || ''))
        );

        if (selectedCategories.size > 0) {
            data = data.filter(item => selectedCategories.has(item.itemCategory));
        }

        if (selectedStatuses.size > 0) {
            data = data.filter(item => item.status && selectedStatuses.has(item.status));
        }

        if (selectedConditions.size > 0) {
            data = data.filter(item => item.condition && selectedConditions.has(item.condition));
        }

        if (purchaseDateStart) {
            data = data.filter(item => item.purchaseDate && item.purchaseDate >= purchaseDateStart);
        }

        if (purchaseDateEnd) {
            data = data.filter(item => item.purchaseDate && item.purchaseDate <= purchaseDateEnd);
        }

        if (sortConfig) {
            data.sort((a, b) => {
                const aValue = getSortValue(a, sortConfig.key);
                const bValue = getSortValue(b, sortConfig.key);

                // Handle undefined/null
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return data;
    }, [inventory, searchTerm, sortConfig]);"""

replace = """    const tableData = useMemo(() => {
        // Optimize: Hoist static string conversion outside the loop to avoid redundant operations
        const searchTermLower = searchTerm?.toLowerCase() || '';

        // Optimize: Single-pass iteration to prevent intermediate array allocations
        let data = inventory.filter(item => {
            if (searchTermLower) {
                const matchesName = item.itemName && item.itemName.toLowerCase().includes(searchTermLower);
                const matchesCat = item.itemCategory && item.itemCategory.toLowerCase().includes(searchTermLower);
                if (!matchesName && !matchesCat) return false;
            }

            if (selectedCategories.size > 0 && !selectedCategories.has(item.itemCategory)) return false;
            if (selectedStatuses.size > 0 && (!item.status || !selectedStatuses.has(item.status))) return false;
            if (selectedConditions.size > 0 && (!item.condition || !selectedConditions.has(item.condition))) return false;
            if (purchaseDateStart && (!item.purchaseDate || item.purchaseDate < purchaseDateStart)) return false;
            if (purchaseDateEnd && (!item.purchaseDate || item.purchaseDate > purchaseDateEnd)) return false;

            return true;
        });

        if (sortConfig) {
            data.sort((a, b) => {
                const aValue = getSortValue(a, sortConfig.key);
                const bValue = getSortValue(b, sortConfig.key);

                // Handle undefined/null
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return data;
    }, [
        inventory,
        searchTerm,
        sortConfig,
        selectedCategories,
        selectedStatuses,
        selectedConditions,
        purchaseDateStart,
        purchaseDateEnd
    ]);"""

if search in content:
    with open("components/InventoryDashboard.tsx", "w") as f:
        f.write(content.replace(search, replace))
    print("Patched successfully")
else:
    print("Search block not found")
