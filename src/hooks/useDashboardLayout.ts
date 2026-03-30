import { useState, useEffect } from "react"

const LAYOUT_STORAGE_KEY = "dashboard_layout"
const FAVORITES_STORAGE_KEY = "favorite_communities"

const DEFAULT_LAYOUT = [
  "explorer",
  "communities_card",
  "wallet",
  "marketplace",
  "bounties",
  "payments",
]

export const useDashboardLayout = () => {
  const [layout, setLayout] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Initialization
  useEffect(() => {
    try {
      // Load favorites
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const parsedFavorites = storedFavorites ? JSON.parse(storedFavorites) : []
      setFavorites(parsedFavorites)

      // Load layout
      const storedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY)
      if (storedLayout) {
        const parsedLayout = JSON.parse(storedLayout)

        // Ensure all favorite widgets exist in layout
        parsedFavorites.forEach((favId: string) => {
          const widgetId = `fav_community_${favId}`
          if (!parsedLayout.includes(widgetId)) {
            parsedLayout.push(widgetId)
          }
        })

        // Ensure all default widgets exist in layout (in case we added new ones to the app)
        DEFAULT_LAYOUT.forEach((widgetId) => {
          if (!parsedLayout.includes(widgetId)) {
            parsedLayout.push(widgetId)
          }
        })

        setLayout(
          Array.from(
            new Set(parsedLayout.filter((id: any) => id && id !== "null")),
          ),
        )
      } else {
        // First time load: Default layout + any existing favorites
        const initialLayout = [...DEFAULT_LAYOUT]
        parsedFavorites.forEach((favId: string) => {
          initialLayout.push(`fav_community_${favId}`)
        })
        setLayout(initialLayout)
      }
    } catch (e) {
      console.error("Failed to load layout from local storage", e)
      setLayout(DEFAULT_LAYOUT)
      setFavorites([])
    } finally {
      setIsLoaded(true)
    }
  }, [])

  const updateLayout = (newLayout: string[]) => {
    const sanitized = Array.from(
      new Set(newLayout.filter((id) => id && id !== "null")),
    )
    setLayout(sanitized)
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(sanitized))
  }

  const toggleFavorite = (communityId: string) => {
    const isFavorite = favorites.includes(communityId)
    const widgetId = `fav_community_${communityId}`

    let newFavorites: string[]
    let newLayout: string[]

    if (isFavorite) {
      // Remove favorite
      newFavorites = favorites.filter((id) => id !== communityId)
      newLayout = layout.filter((id) => id !== widgetId)
    } else {
      // Add favorite
      newFavorites = [...favorites, communityId]
      // Insert right after 'communities_card' if it exists, else at the end
      newLayout = [...layout]
      const communitiesIndex = newLayout.indexOf("communities_card")
      if (communitiesIndex !== -1) {
        newLayout.splice(communitiesIndex + 1, 0, widgetId)
      } else {
        newLayout.push(widgetId)
      }
    }

    setFavorites(newFavorites)
    setLayout(newLayout)
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites))
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newLayout))
  }

  return {
    layout,
    favorites,
    isLoaded,
    updateLayout,
    toggleFavorite,
  }
}
