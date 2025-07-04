"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building, User, Users, Settings, CheckCircle } from "lucide-react"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Organization } from "@workos-inc/node"

interface TeamWithStats extends Organization {
  memberCount: number
  isCurrentTeam: boolean
}

interface TeamsListProps {
  teams: TeamWithStats[]
}

export function TeamsList({ teams }: TeamsListProps) {
  const router = useRouter()
  const [switchingTeam, setSwitchingTeam] = React.useState<string | null>(null)

  const handleSelectTeam = async (teamId: string) => {
    setSwitchingTeam(teamId)
    
    try {
      const response = await fetch('/api/teams/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: teamId }),
      })

      if (!response.ok) {
        throw new Error('Failed to switch team')
      }

      const data = await response.json()
      
      // Redirect based on user role
      if (data.userRole === 'admin') {
        // Navigate to team settings for admins
        router.push('/admin/teams/settings')
      }
      
      toast.success('Team selected successfully')
    } catch (error) {
      console.error('Failed to switch team:', error)
      toast.error('Failed to switch team')
    } finally {
      setSwitchingTeam(null)
    }
  }

  const getTeamIcon = (team: TeamWithStats) => {
    return team.metadata?.personal === "true" ? User : Building
  }

  const getTeamType = (team: TeamWithStats) => {
    return team.metadata?.personal === "true" ? "Personal" : "Team"
  }

  const getTeamColor = (team: TeamWithStats) => {
    return team.metadata?.colour || "#ff5c4d"
  }

  // Sort teams: current team first, then alphabetically
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.isCurrentTeam && !b.isCurrentTeam) return -1
    if (!a.isCurrentTeam && b.isCurrentTeam) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedTeams.map((team) => {
        const TeamIcon = getTeamIcon(team)
        const teamColor = getTeamColor(team)
        const isCurrentTeam = team.isCurrentTeam
        const isSwitching = switchingTeam === team.id

        return (
          <Card 
            key={team.id} 
            className={`relative cursor-pointer transition-all hover:shadow-md ${
              isCurrentTeam ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => !isSwitching && handleSelectTeam(team.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: teamColor }}
                  >
                    <TeamIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate mb-1">{team.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {getTeamType(team)}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                {isCurrentTeam && (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </div>
            </CardHeader>
            
            <CardContent>

              <div className="space-y-4">

                <div className="flex items-center justify-between text-sm">
                  {team.metadata?.description}
                </div>
                  
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Members
                  </span>
                  <span className="font-medium">{team.memberCount}</span>
                </div>
                
                {team.domains && team.domains.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Domains</span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {team.domains.slice(0, 2).map((domain) => (
                        <Badge key={domain.id} variant="secondary" className="text-xs">
                          {domain.domain}
                        </Badge>
                      ))}
                      {team.domains.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{team.domains.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className={`flex items-center pt-2 ${isCurrentTeam ? 'justify-between' : 'justify-end'}`}>
                  {isCurrentTeam && (
                    <span className="text-xs text-muted-foreground">
                      Active Team
                    </span>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isSwitching}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectTeam(team.id)
                    }}
                  >
                    {isSwitching ? (
                      "Switching..."
                    ) : isCurrentTeam ? (
                      <>
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                      </>
                    ) : (
                      "Select"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}