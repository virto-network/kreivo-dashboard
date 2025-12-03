export const resolveUserAddress = async (username: string): Promise<string> => {
  const cleanUsername = username.startsWith("@")
    ? username.substring(1)
    : username

  if (!cleanUsername) {
    throw new Error("Username cannot be empty")
  }

  try {
    const response = await fetch(
      `https://connect.virto.one/api/get-user-address?userId=${encodeURIComponent(cleanUsername)}`,
    )

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `User @${cleanUsername} is not registered. Please verify the username or use a wallet address.`,
        )
      }
      throw new Error(
        `Failed to resolve user @${cleanUsername}: Server error ${response.status}`,
      )
    }

    const data = await response.json()

    if (!data.address) {
      throw new Error(
        `User @${cleanUsername} found but has no associated address.`,
      )
    }

    return data.address
  } catch (error: any) {
    if (error.message.includes("User @")) {
      throw error
    }
    throw new Error(`Error resolving user @${cleanUsername}: ${error.message}`)
  }
}
