"use client"

import * as React from "react"
import { IncidentCard } from "./incident-card"
import { cn } from "@/lib/utils"

function groupIncidentsByDate(incidents) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    const groups = {
        today: [],
        yesterday: [],
        thisWeek: [],
        older: [],
    }

    incidents.forEach((incident) => {
        const incidentDate = new Date(incident.timestamp)
        const incidentDay = new Date(
            incidentDate.getFullYear(),
            incidentDate.getMonth(),
            incidentDate.getDate()
        )

        if (incidentDay.getTime() === today.getTime()) {
            groups.today.push(incident)
        } else if (incidentDay.getTime() === yesterday.getTime()) {
            groups.yesterday.push(incident)
        } else if (incidentDate >= thisWeek) {
            groups.thisWeek.push(incident)
        } else {
            groups.older.push(incident)
        }
    })

    return groups
}

export function IncidentTimeline({ incidents = [] }) {
    if (incidents.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                    <svg
                        className="size-8 text-green-600 dark:text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Incidents</h3>
                <p className="text-muted-foreground">
                    All systems are operational. No incidents to report.
                </p>
            </div>
        )
    }

    const groupedIncidents = groupIncidentsByDate(incidents)

    return (
        <div className="space-y-8">
            {groupedIncidents.today.length > 0 && (
                <TimelineGroup title="Today" incidents={groupedIncidents.today} />
            )}
            {groupedIncidents.yesterday.length > 0 && (
                <TimelineGroup title="Yesterday" incidents={groupedIncidents.yesterday} />
            )}
            {groupedIncidents.thisWeek.length > 0 && (
                <TimelineGroup title="This Week" incidents={groupedIncidents.thisWeek} />
            )}
            {groupedIncidents.older.length > 0 && (
                <TimelineGroup title="Older" incidents={groupedIncidents.older} />
            )}
        </div>
    )
}

function TimelineGroup({ title, incidents }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-4 lg:px-0">
                {title}
            </h3>
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden lg:block" />

                {/* Incidents */}
                <div className="space-y-4">
                    {incidents.map((incident, idx) => (
                        <div key={incident.id || idx} className="relative pl-0 lg:pl-16">
                            {/* Timeline dot */}
                            <div className="absolute left-6 top-6 size-4 rounded-full bg-background border-2 border-primary hidden lg:block" />

                            <IncidentCard incident={incident} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
