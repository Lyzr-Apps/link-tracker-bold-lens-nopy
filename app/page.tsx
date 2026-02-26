'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { FaTwitter, FaInstagram, FaTiktok, FaChartBar, FaChartLine, FaTrophy, FaSearch, FaTrash, FaDownload, FaPlus, FaFilter, FaEye, FaHeart, FaComment, FaShareAlt, FaExternalLinkAlt, FaVideo, FaTimes, FaMedal, FaUsers, FaGlobe, FaBullseye, FaStar, FaChevronDown, FaChevronUp, FaSort, FaSortUp, FaSortDown, FaInfoCircle, FaCog } from 'react-icons/fa'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer
} from 'recharts'

// ---- TYPES ----

interface VideoMetrics {
  id: string
  platform: string
  influencer_name: string
  influencer_handle: string
  video_title: string
  video_url: string
  views: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
  estimated_reach: number
  estimated_impressions: number
  is_estimated: boolean
  analysis_summary: string
  campaign: string
  dateAdded: string
}

type SortField = 'dateAdded' | 'platform' | 'influencer_name' | 'campaign' | 'views' | 'likes' | 'comments' | 'shares' | 'engagement_rate' | 'estimated_reach' | 'estimated_impressions'
type SortDirection = 'asc' | 'desc'

// ---- CONSTANTS ----

const AGENT_ID = '699feec843916312e1f04811'
const LS_KEY = 'influencer_video_tracker_data'

const PLATFORM_COLORS: Record<string, string> = {
  'Twitter': '#1DA1F2',
  'Instagram': '#E4405F',
  'TikTok': '#ff0050',
}

const PLATFORM_BG: Record<string, string> = {
  'Twitter': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Instagram': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'TikTok': 'bg-red-500/20 text-red-400 border-red-500/30',
}

const CHART_COLORS = ['#1DA1F2', '#E4405F', '#ff0050', '#10B981', '#8B5CF6', '#F59E0B']

// ---- HELPERS ----

function formatNumber(num: number): string {
  if (!num && num !== 0) return '0'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function formatDate(iso: string): string {
  if (!iso) return 'N/A'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'N/A'
  }
}

function formatShortDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function getPlatformIcon(platform: string) {
  const p = (platform || '').toLowerCase()
  if (p.includes('twitter') || p.includes('x')) return <FaTwitter className="w-4 h-4" />
  if (p.includes('instagram')) return <FaInstagram className="w-4 h-4" />
  if (p.includes('tiktok')) return <FaTiktok className="w-4 h-4" />
  return <FaVideo className="w-4 h-4" />
}

function getPlatformColor(platform: string): string {
  const p = (platform || '').toLowerCase()
  if (p.includes('twitter') || p.includes('x')) return PLATFORM_COLORS['Twitter']
  if (p.includes('instagram')) return PLATFORM_COLORS['Instagram']
  if (p.includes('tiktok')) return PLATFORM_COLORS['TikTok']
  return '#6B7280'
}

function getPlatformBadgeClass(platform: string): string {
  const p = (platform || '').toLowerCase()
  if (p.includes('twitter') || p.includes('x')) return PLATFORM_BG['Twitter']
  if (p.includes('instagram')) return PLATFORM_BG['Instagram']
  if (p.includes('tiktok')) return PLATFORM_BG['TikTok']
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

// ---- SAMPLE DATA ----

const SAMPLE_DATA: VideoMetrics[] = [
  {
    id: 'sample-1',
    platform: 'Instagram',
    influencer_name: 'Sarah Johnson',
    influencer_handle: '@sarahjstyle',
    video_title: 'Summer Collection Try-On Haul 2025',
    video_url: 'https://instagram.com/reel/abc123',
    views: 2450000,
    likes: 185000,
    comments: 4200,
    shares: 12800,
    engagement_rate: 8.2,
    estimated_reach: 1800000,
    estimated_impressions: 3200000,
    is_estimated: true,
    analysis_summary: 'Strong performance with above-average engagement rate for Instagram Reels. The try-on format resonated well with the target audience, driving significant saves and shares.',
    campaign: 'Summer Launch 2025',
    dateAdded: '2025-06-15T10:30:00Z'
  },
  {
    id: 'sample-2',
    platform: 'TikTok',
    influencer_name: 'Alex Rivera',
    influencer_handle: '@alexrivera',
    video_title: 'POV: When you find the perfect skincare routine',
    video_url: 'https://tiktok.com/@alexrivera/video/123',
    views: 5800000,
    likes: 420000,
    comments: 15600,
    shares: 89000,
    engagement_rate: 9.1,
    estimated_reach: 4200000,
    estimated_impressions: 7800000,
    is_estimated: false,
    analysis_summary: 'Viral performance with exceptional share rate. The POV format and relatable content drove algorithm amplification. Top 1% engagement for skincare content on TikTok.',
    campaign: 'Skincare Brand Partnership',
    dateAdded: '2025-06-18T14:20:00Z'
  },
  {
    id: 'sample-3',
    platform: 'Twitter',
    influencer_name: 'Marcus Tech',
    influencer_handle: '@marcustech',
    video_title: 'New iPhone 17 Pro Review - Game Changer?',
    video_url: 'https://x.com/marcustech/status/123',
    views: 890000,
    likes: 42000,
    comments: 3800,
    shares: 18500,
    engagement_rate: 7.2,
    estimated_reach: 650000,
    estimated_impressions: 1200000,
    is_estimated: true,
    analysis_summary: 'Solid tech review performance. High retweet ratio indicates strong shareability. Comment sentiment is predominantly positive with active discussion about features.',
    campaign: 'Tech Review Series',
    dateAdded: '2025-06-20T09:15:00Z'
  },
  {
    id: 'sample-4',
    platform: 'Instagram',
    influencer_name: 'Fitness by Maya',
    influencer_handle: '@fitnessbymaya',
    video_title: '30-Day Transformation Results - Honest Review',
    video_url: 'https://instagram.com/reel/def456',
    views: 1250000,
    likes: 98000,
    comments: 6700,
    shares: 22000,
    engagement_rate: 10.1,
    estimated_reach: 950000,
    estimated_impressions: 1600000,
    is_estimated: false,
    analysis_summary: 'Exceptional engagement driven by authentic transformation content. High save rate indicates evergreen value. Comments show strong purchase intent.',
    campaign: 'Summer Launch 2025',
    dateAdded: '2025-06-22T16:45:00Z'
  },
  {
    id: 'sample-5',
    platform: 'TikTok',
    influencer_name: 'Sarah Johnson',
    influencer_handle: '@sarahjstyle',
    video_title: 'Get Ready With Me - Summer Vibes',
    video_url: 'https://tiktok.com/@sarahjstyle/video/456',
    views: 3200000,
    likes: 280000,
    comments: 9400,
    shares: 45000,
    engagement_rate: 10.4,
    estimated_reach: 2400000,
    estimated_impressions: 4800000,
    is_estimated: true,
    analysis_summary: 'Cross-platform success with the GRWM format performing even better on TikTok. The music choice and editing style aligned well with trending content patterns.',
    campaign: 'Summer Launch 2025',
    dateAdded: '2025-06-25T11:00:00Z'
  }
]

// ---- ERROR BOUNDARY ----

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- METRIC CARD COMPONENT ----

function MetricCard({ icon, label, value, subtitle, color }: { icon: React.ReactNode; label: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-400">
        <span style={{ color: color || undefined }}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-100">{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  )
}

// ---- LATEST RESULT CARD ----

function LatestResultCard({ video, onClose }: { video: VideoMetrics; onClose: () => void }) {
  return (
    <Card className="bg-gray-800/60 border-gray-700/50 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getPlatformBadgeClass(video.platform)}`}>
              {getPlatformIcon(video.platform)}
              {video.platform}
            </span>
            <div>
              <CardTitle className="text-lg text-gray-100">{video.influencer_name || 'Unknown'}</CardTitle>
              <CardDescription className="text-gray-400">{video.influencer_handle || ''}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {video.is_estimated && (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">Estimated</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-gray-200 h-8 w-8 p-0">
              <FaTimes className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {video.video_title && (
          <p className="text-sm text-gray-300 mt-2 line-clamp-2">{video.video_title}</p>
        )}
        {video.video_url && (
          <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mt-1">
            <FaExternalLinkAlt className="w-3 h-3" /> View Original
          </a>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard icon={<FaEye className="w-3.5 h-3.5" />} label="Views" value={formatNumber(video.views)} color="#60A5FA" />
          <MetricCard icon={<FaHeart className="w-3.5 h-3.5" />} label="Likes" value={formatNumber(video.likes)} color="#F472B6" />
          <MetricCard icon={<FaComment className="w-3.5 h-3.5" />} label="Comments" value={formatNumber(video.comments)} color="#34D399" />
          <MetricCard icon={<FaShareAlt className="w-3.5 h-3.5" />} label="Shares" value={formatNumber(video.shares)} color="#A78BFA" />
          <MetricCard icon={<FaBullseye className="w-3.5 h-3.5" />} label="Engagement" value={`${(video.engagement_rate || 0).toFixed(1)}%`} color="#FBBF24" />
          <MetricCard icon={<FaUsers className="w-3.5 h-3.5" />} label="Reach" value={formatNumber(video.estimated_reach)} color="#38BDF8" />
          <MetricCard icon={<FaGlobe className="w-3.5 h-3.5" />} label="Impressions" value={formatNumber(video.estimated_impressions)} color="#818CF8" />
        </div>
        {video.analysis_summary && (
          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Analysis Summary</h4>
            <div className="text-sm text-gray-300">{renderMarkdown(video.analysis_summary)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---- DASHBOARD OVERVIEW TAB ----

function DashboardOverview({ videos }: { videos: VideoMetrics[] }) {
  const totalVideos = videos.length
  const avgEngagement = totalVideos > 0 ? videos.reduce((s, v) => s + (v.engagement_rate || 0), 0) / totalVideos : 0
  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0)
  const totalReach = videos.reduce((s, v) => s + (v.estimated_reach || 0), 0)
  const uniqueCampaigns = [...new Set(videos.map(v => v.campaign).filter(Boolean))]
  const uniqueInfluencers = [...new Set(videos.map(v => v.influencer_name).filter(Boolean))]

  const topPlatform = useMemo(() => {
    if (totalVideos === 0) return 'N/A'
    const counts: Record<string, number> = {}
    videos.forEach(v => { counts[v.platform] = (counts[v.platform] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  }, [videos, totalVideos])

  const topInfluencer = useMemo(() => {
    if (totalVideos === 0) return 'N/A'
    const map: Record<string, { totalEng: number; count: number }> = {}
    videos.forEach(v => {
      const name = v.influencer_name || 'Unknown'
      if (!map[name]) map[name] = { totalEng: 0, count: 0 }
      map[name].totalEng += v.engagement_rate || 0
      map[name].count += 1
    })
    return Object.entries(map).sort((a, b) => (b[1].totalEng / b[1].count) - (a[1].totalEng / a[1].count))[0]?.[0] || 'N/A'
  }, [videos, totalVideos])

  const recentVideos = useMemo(() => {
    return [...videos].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()).slice(0, 5)
  }, [videos])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={<FaVideo className="w-3.5 h-3.5" />} label="Total Videos" value={totalVideos.toString()} color="#60A5FA" />
        <MetricCard icon={<FaBullseye className="w-3.5 h-3.5" />} label="Avg Engagement" value={`${avgEngagement.toFixed(1)}%`} color="#FBBF24" />
        <MetricCard icon={<FaEye className="w-3.5 h-3.5" />} label="Total Views" value={formatNumber(totalViews)} color="#34D399" />
        <MetricCard icon={<FaUsers className="w-3.5 h-3.5" />} label="Total Reach" value={formatNumber(totalReach)} color="#38BDF8" />
        <MetricCard icon={<FaStar className="w-3.5 h-3.5" />} label="Top Platform" value={topPlatform} color={getPlatformColor(topPlatform)} />
        <MetricCard icon={<FaTrophy className="w-3.5 h-3.5" />} label="Top Influencer" value={topInfluencer.length > 12 ? topInfluencer.slice(0, 12) + '...' : topInfluencer} color="#F472B6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800/60 border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-200 flex items-center gap-2"><FaChartBar className="w-4 h-4 text-blue-400" /> Campaigns Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {uniqueCampaigns.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No campaigns tracked yet</p>
            ) : (
              <div className="space-y-3">
                {uniqueCampaigns.map(campaign => {
                  const campVideos = videos.filter(v => v.campaign === campaign)
                  const campAvgEng = campVideos.reduce((s, v) => s + (v.engagement_rate || 0), 0) / campVideos.length
                  return (
                    <div key={campaign} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-200">{campaign}</p>
                        <p className="text-xs text-gray-500">{campVideos.length} video{campVideos.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-400">{campAvgEng.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">avg engagement</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800/60 border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-200 flex items-center gap-2"><FaChartLine className="w-4 h-4 text-green-400" /> Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentVideos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No videos tracked yet. Paste a video URL above to get started.</p>
            ) : (
              <div className="space-y-2">
                {recentVideos.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-2.5 bg-gray-900/50 rounded-lg">
                    <span style={{ color: getPlatformColor(v.platform) }}>{getPlatformIcon(v.platform)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{v.influencer_name}</p>
                      <p className="text-xs text-gray-500 truncate">{v.video_title || v.campaign}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-gray-300">{formatNumber(v.views)} views</p>
                      <p className="text-xs text-gray-500">{formatDate(v.dateAdded)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {totalVideos > 0 && (
        <Card className="bg-gray-800/60 border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-200 flex items-center gap-2"><FaChartBar className="w-4 h-4 text-purple-400" /> Influencer Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uniqueInfluencers.map(name => {
                  const inf = videos.filter(v => v.influencer_name === name)
                  return { name: name.length > 15 ? name.slice(0, 15) + '...' : name, engagement: Number((inf.reduce((s, v) => s + (v.engagement_rate || 0), 0) / inf.length).toFixed(1)), views: inf.reduce((s, v) => s + (v.views || 0), 0) }
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#E5E7EB' }} />
                  <Bar dataKey="engagement" fill="#8B5CF6" name="Avg Engagement %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---- VIDEOS TABLE TAB ----

function VideosTable({ videos, onDelete }: { videos: VideoMetrics[]; onDelete: (id: string) => void }) {
  const [sortField, setSortField] = useState<SortField>('dateAdded')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const campaigns = useMemo(() => [...new Set(videos.map(v => v.campaign).filter(Boolean))], [videos])

  const filtered = useMemo(() => {
    let items = [...videos]
    if (platformFilter !== 'all') items = items.filter(v => (v.platform || '').toLowerCase().includes(platformFilter.toLowerCase()))
    if (campaignFilter !== 'all') items = items.filter(v => v.campaign === campaignFilter)
    if (searchTerm) items = items.filter(v => (v.influencer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (v.influencer_handle || '').toLowerCase().includes(searchTerm.toLowerCase()))
    items.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''
      if (sortField === 'dateAdded') { aVal = new Date(a.dateAdded).getTime(); bVal = new Date(b.dateAdded).getTime() }
      else if (sortField === 'platform' || sortField === 'influencer_name' || sortField === 'campaign') { aVal = (a[sortField] || '').toLowerCase(); bVal = (b[sortField] || '').toLowerCase() }
      else { aVal = Number(a[sortField]) || 0; bVal = Number(b[sortField]) || 0 }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return items
  }, [videos, platformFilter, campaignFilter, searchTerm, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <FaSort className="w-3 h-3 text-gray-600" />
    return sortDir === 'asc' ? <FaSortUp className="w-3 h-3 text-blue-400" /> : <FaSortDown className="w-3 h-3 text-blue-400" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input placeholder="Search influencer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-gray-800/60 border-gray-700/50 text-gray-200 placeholder:text-gray-500" />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-gray-800/60 border-gray-700/50 text-gray-200">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-gray-800/60 border-gray-700/50 text-gray-200">
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-gray-800/60 border-gray-700/50">
          <CardContent className="py-12 text-center">
            <FaVideo className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No videos found. {videos.length === 0 ? 'Track your first video above.' : 'Try adjusting filters.'}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-800/60 border-gray-700/50 overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700/50 hover:bg-transparent">
                    <TableHead className="text-gray-400 cursor-pointer select-none" onClick={() => toggleSort('dateAdded')}>
                      <span className="flex items-center gap-1">Date {getSortIcon('dateAdded')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none" onClick={() => toggleSort('platform')}>
                      <span className="flex items-center gap-1">Platform {getSortIcon('platform')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none" onClick={() => toggleSort('influencer_name')}>
                      <span className="flex items-center gap-1">Influencer {getSortIcon('influencer_name')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none" onClick={() => toggleSort('campaign')}>
                      <span className="flex items-center gap-1">Campaign {getSortIcon('campaign')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none text-right" onClick={() => toggleSort('views')}>
                      <span className="flex items-center gap-1 justify-end">Views {getSortIcon('views')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none text-right" onClick={() => toggleSort('likes')}>
                      <span className="flex items-center gap-1 justify-end">Likes {getSortIcon('likes')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none text-right" onClick={() => toggleSort('comments')}>
                      <span className="flex items-center gap-1 justify-end">Comments {getSortIcon('comments')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none text-right" onClick={() => toggleSort('shares')}>
                      <span className="flex items-center gap-1 justify-end">Shares {getSortIcon('shares')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none text-right" onClick={() => toggleSort('engagement_rate')}>
                      <span className="flex items-center gap-1 justify-end">Eng% {getSortIcon('engagement_rate')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none text-right" onClick={() => toggleSort('estimated_reach')}>
                      <span className="flex items-center gap-1 justify-end">Reach {getSortIcon('estimated_reach')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 cursor-pointer select-none text-right" onClick={() => toggleSort('estimated_impressions')}>
                      <span className="flex items-center gap-1 justify-end">Impr. {getSortIcon('estimated_impressions')}</span>
                    </TableHead>
                    <TableHead className="text-gray-400 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(v => (
                    <TableRow key={v.id} className="border-gray-700/30 hover:bg-gray-700/20">
                      <TableCell className="text-gray-300 text-xs whitespace-nowrap">{formatDate(v.dateAdded)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPlatformBadgeClass(v.platform)}`}>
                          {getPlatformIcon(v.platform)} {v.platform}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-gray-200 font-medium">{v.influencer_name}</p>
                          <p className="text-xs text-gray-500">{v.influencer_handle}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">{v.campaign}</TableCell>
                      <TableCell className="text-gray-200 text-sm text-right font-medium">{formatNumber(v.views)}</TableCell>
                      <TableCell className="text-gray-300 text-sm text-right">{formatNumber(v.likes)}</TableCell>
                      <TableCell className="text-gray-300 text-sm text-right">{formatNumber(v.comments)}</TableCell>
                      <TableCell className="text-gray-300 text-sm text-right">{formatNumber(v.shares)}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-amber-400">{(v.engagement_rate || 0).toFixed(1)}%</span>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm text-right">{formatNumber(v.estimated_reach)}</TableCell>
                      <TableCell className="text-gray-300 text-sm text-right">{formatNumber(v.estimated_impressions)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(v.id)} className="text-gray-500 hover:text-red-400 h-7 w-7 p-0">
                          <FaTrash className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
          <CardFooter className="border-t border-gray-700/30 py-3 px-4">
            <p className="text-xs text-gray-500">{filtered.length} of {videos.length} video{videos.length !== 1 ? 's' : ''}</p>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

// ---- CAMPAIGNS TAB ----

function CampaignsView({ videos }: { videos: VideoMetrics[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const campaigns = useMemo(() => {
    const map: Record<string, VideoMetrics[]> = {}
    videos.forEach(v => {
      const key = v.campaign || 'Uncategorized'
      if (!map[key]) map[key] = []
      map[key].push(v)
    })
    return Object.entries(map).map(([name, vids]) => ({
      name,
      videos: vids,
      totalViews: vids.reduce((s, v) => s + (v.views || 0), 0),
      totalReach: vids.reduce((s, v) => s + (v.estimated_reach || 0), 0),
      totalImpressions: vids.reduce((s, v) => s + (v.estimated_impressions || 0), 0),
      avgEngagement: vids.reduce((s, v) => s + (v.engagement_rate || 0), 0) / vids.length,
    })).sort((a, b) => b.totalViews - a.totalViews)
  }, [videos])

  if (campaigns.length === 0) {
    return (
      <Card className="bg-gray-800/60 border-gray-700/50">
        <CardContent className="py-12 text-center">
          <FaChartBar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No campaigns yet. Assign a campaign name when analyzing videos.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {campaigns.map(camp => (
        <Card key={camp.name} className="bg-gray-800/60 border-gray-700/50">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(expanded === camp.name ? null : camp.name)}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-gray-200">{camp.name}</CardTitle>
                <CardDescription className="text-gray-400">{camp.videos.length} video{camp.videos.length !== 1 ? 's' : ''} tracked</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex gap-6 text-right">
                  <div>
                    <p className="text-xs text-gray-500">Avg Engagement</p>
                    <p className="text-sm font-semibold text-amber-400">{camp.avgEngagement.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Reach</p>
                    <p className="text-sm font-semibold text-blue-400">{formatNumber(camp.totalReach)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Impressions</p>
                    <p className="text-sm font-semibold text-purple-400">{formatNumber(camp.totalImpressions)}</p>
                  </div>
                </div>
                {expanded === camp.name ? <FaChevronUp className="w-4 h-4 text-gray-400" /> : <FaChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
          </CardHeader>
          {expanded === camp.name && (
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 sm:hidden">
                <MetricCard icon={<FaBullseye className="w-3 h-3" />} label="Avg Eng" value={`${camp.avgEngagement.toFixed(1)}%`} color="#FBBF24" />
                <MetricCard icon={<FaUsers className="w-3 h-3" />} label="Reach" value={formatNumber(camp.totalReach)} color="#38BDF8" />
                <MetricCard icon={<FaGlobe className="w-3 h-3" />} label="Impressions" value={formatNumber(camp.totalImpressions)} color="#818CF8" />
                <MetricCard icon={<FaEye className="w-3 h-3" />} label="Views" value={formatNumber(camp.totalViews)} color="#60A5FA" />
              </div>
              <div className="space-y-2">
                {camp.videos.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                    <span style={{ color: getPlatformColor(v.platform) }}>{getPlatformIcon(v.platform)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">{v.influencer_name}</p>
                      <p className="text-xs text-gray-500 truncate">{v.video_title || 'Untitled'}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-right shrink-0">
                      <div><p className="text-xs text-gray-500">Views</p><p className="text-sm text-gray-300">{formatNumber(v.views)}</p></div>
                      <div><p className="text-xs text-gray-500">Eng%</p><p className="text-sm font-semibold text-amber-400">{(v.engagement_rate || 0).toFixed(1)}%</p></div>
                    </div>
                    <p className="text-xs text-gray-500 shrink-0 sm:hidden">{(v.engagement_rate || 0).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

// ---- INFLUENCER COMPARISON TAB ----

function InfluencerComparison({ videos }: { videos: VideoMetrics[] }) {
  const influencers = useMemo(() => {
    const map: Record<string, VideoMetrics[]> = {}
    videos.forEach(v => {
      const key = v.influencer_name || 'Unknown'
      if (!map[key]) map[key] = []
      map[key].push(v)
    })
    return Object.entries(map).map(([name, vids]) => {
      const best = [...vids].sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))[0]
      return {
        name,
        handle: vids[0]?.influencer_handle || '',
        totalVideos: vids.length,
        avgEngagement: vids.reduce((s, v) => s + (v.engagement_rate || 0), 0) / vids.length,
        totalViews: vids.reduce((s, v) => s + (v.views || 0), 0),
        totalLikes: vids.reduce((s, v) => s + (v.likes || 0), 0),
        totalReach: vids.reduce((s, v) => s + (v.estimated_reach || 0), 0),
        bestVideo: best,
        platforms: [...new Set(vids.map(v => v.platform))]
      }
    }).sort((a, b) => b.avgEngagement - a.avgEngagement)
  }, [videos])

  if (influencers.length === 0) {
    return (
      <Card className="bg-gray-800/60 border-gray-700/50">
        <CardContent className="py-12 text-center">
          <FaUsers className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No influencers tracked yet.</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = influencers.map(inf => ({
    name: inf.name.length > 12 ? inf.name.slice(0, 12) + '...' : inf.name,
    engagement: Number(inf.avgEngagement.toFixed(1)),
    views: inf.totalViews,
  }))

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/60 border-gray-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-200 flex items-center gap-2"><FaChartBar className="w-4 h-4 text-blue-400" /> Influencer Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(val) => formatNumber(val)} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#E5E7EB' }} formatter={(value: number, name: string) => [name === 'views' ? formatNumber(value) : value + '%', name === 'views' ? 'Total Views' : 'Avg Engagement']} />
                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                <Bar yAxisId="left" dataKey="engagement" fill="#8B5CF6" name="Avg Engagement %" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="views" fill="#3B82F6" name="Total Views" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {influencers.map((inf, idx) => (
          <Card key={inf.name} className="bg-gray-800/60 border-gray-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-gray-200">{inf.name}</CardTitle>
                  <CardDescription className="text-gray-400">{inf.handle}</CardDescription>
                </div>
                {idx < 3 && (
                  <span className={`text-lg ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : 'text-amber-700'}`}>
                    <FaMedal />
                  </span>
                )}
              </div>
              <div className="flex gap-1 mt-1">
                {inf.platforms.map(p => (
                  <span key={p} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${getPlatformBadgeClass(p)}`}>
                    {getPlatformIcon(p)}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500">Videos</p>
                  <p className="text-lg font-bold text-gray-200">{inf.totalVideos}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500">Avg Engagement</p>
                  <p className="text-lg font-bold text-amber-400">{inf.avgEngagement.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500">Total Views</p>
                  <p className="text-lg font-bold text-blue-400">{formatNumber(inf.totalViews)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500">Total Reach</p>
                  <p className="text-lg font-bold text-green-400">{formatNumber(inf.totalReach)}</p>
                </div>
              </div>
              {inf.bestVideo && (
                <div className="mt-3 p-2.5 bg-gray-900/50 rounded-lg border border-gray-700/30">
                  <p className="text-xs text-gray-500 mb-1">Best Performing Video</p>
                  <p className="text-sm text-gray-300 truncate">{inf.bestVideo.video_title || 'Untitled'}</p>
                  <p className="text-xs text-amber-400 mt-0.5">{(inf.bestVideo.engagement_rate || 0).toFixed(1)}% engagement - {formatNumber(inf.bestVideo.views)} views</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---- PLATFORM COMPARISON TAB ----

function PlatformComparison({ videos }: { videos: VideoMetrics[] }) {
  const platforms = useMemo(() => {
    const map: Record<string, VideoMetrics[]> = {}
    videos.forEach(v => {
      const key = v.platform || 'Unknown'
      if (!map[key]) map[key] = []
      map[key].push(v)
    })
    return Object.entries(map).map(([name, vids]) => ({
      name,
      count: vids.length,
      avgEngagement: vids.reduce((s, v) => s + (v.engagement_rate || 0), 0) / vids.length,
      totalViews: vids.reduce((s, v) => s + (v.views || 0), 0),
      totalLikes: vids.reduce((s, v) => s + (v.likes || 0), 0),
      totalReach: vids.reduce((s, v) => s + (v.estimated_reach || 0), 0),
      totalImpressions: vids.reduce((s, v) => s + (v.estimated_impressions || 0), 0),
      color: getPlatformColor(name),
    }))
  }, [videos])

  if (platforms.length === 0) {
    return (
      <Card className="bg-gray-800/60 border-gray-700/50">
        <CardContent className="py-12 text-center">
          <FaGlobe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No platform data yet.</p>
        </CardContent>
      </Card>
    )
  }

  const pieData = platforms.map(p => ({ name: p.name, value: p.count }))
  const barData = platforms.map(p => ({ name: p.name, engagement: Number(p.avgEngagement.toFixed(1)), views: p.totalViews }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {platforms.map(p => (
          <Card key={p.name} className="bg-gray-800/60 border-gray-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span style={{ color: p.color }}>{getPlatformIcon(p.name)}</span>
                <CardTitle className="text-lg text-gray-200">{p.name}</CardTitle>
                <Badge variant="outline" className="ml-auto text-gray-400 border-gray-600">{p.count} video{p.count !== 1 ? 's' : ''}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-gray-500">Avg Engagement</span><span className="text-sm font-semibold text-amber-400">{p.avgEngagement.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Total Views</span><span className="text-sm font-semibold text-blue-400">{formatNumber(p.totalViews)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Total Likes</span><span className="text-sm font-semibold text-pink-400">{formatNumber(p.totalLikes)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Total Reach</span><span className="text-sm font-semibold text-green-400">{formatNumber(p.totalReach)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Total Impressions</span><span className="text-sm font-semibold text-purple-400">{formatNumber(p.totalImpressions)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800/60 border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-200">Videos by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={getPlatformColor(entry.name)} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#E5E7EB' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/60 border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-200">Avg Engagement by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#E5E7EB' }} />
                  <Bar dataKey="engagement" name="Avg Engagement %" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={getPlatformColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---- TIMELINE TAB ----

function TimelineView({ videos }: { videos: VideoMetrics[] }) {
  const [metric, setMetric] = useState<'engagement_rate' | 'views'>('engagement_rate')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterCampaign, setFilterCampaign] = useState('all')

  const campaigns = useMemo(() => [...new Set(videos.map(v => v.campaign).filter(Boolean))], [videos])

  const chartData = useMemo(() => {
    let items = [...videos]
    if (filterPlatform !== 'all') items = items.filter(v => (v.platform || '').toLowerCase().includes(filterPlatform.toLowerCase()))
    if (filterCampaign !== 'all') items = items.filter(v => v.campaign === filterCampaign)
    return items
      .sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime())
      .map(v => ({
        date: formatShortDate(v.dateAdded),
        value: metric === 'engagement_rate' ? Number((v.engagement_rate || 0).toFixed(1)) : v.views || 0,
        name: v.influencer_name,
        platform: v.platform,
      }))
  }, [videos, metric, filterPlatform, filterCampaign])

  if (videos.length === 0) {
    return (
      <Card className="bg-gray-800/60 border-gray-700/50">
        <CardContent className="py-12 text-center">
          <FaChartLine className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No timeline data yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={metric} onValueChange={(v) => setMetric(v as 'engagement_rate' | 'views')}>
          <SelectTrigger className="w-full sm:w-48 bg-gray-800/60 border-gray-700/50 text-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="engagement_rate">Engagement Rate</SelectItem>
            <SelectItem value="views">Views</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-full sm:w-40 bg-gray-800/60 border-gray-700/50 text-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCampaign} onValueChange={setFilterCampaign}>
          <SelectTrigger className="w-full sm:w-48 bg-gray-800/60 border-gray-700/50 text-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-gray-800/60 border-gray-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-200">{metric === 'engagement_rate' ? 'Engagement Rate' : 'Views'} Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No data matches the selected filters.</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={metric === 'views' ? (val) => formatNumber(val) : undefined} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#E5E7EB' }}
                    formatter={(value: number) => [metric === 'views' ? formatNumber(value) : value + '%', metric === 'views' ? 'Views' : 'Engagement']}
                    labelFormatter={(label, payload) => {
                      const item = Array.isArray(payload) && payload.length > 0 ? payload[0]?.payload : null
                      return item ? `${label} - ${item.name || ''} (${item.platform || ''})` : label
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---- RANKINGS TAB ----

function RankingsView({ videos }: { videos: VideoMetrics[] }) {
  const [rankBy, setRankBy] = useState<'engagement_rate' | 'views' | 'likes'>('engagement_rate')

  const ranked = useMemo(() => {
    return [...videos].sort((a, b) => {
      const aVal = Number(a[rankBy]) || 0
      const bVal = Number(b[rankBy]) || 0
      return bVal - aVal
    }).slice(0, 10)
  }, [videos, rankBy])

  if (videos.length === 0) {
    return (
      <Card className="bg-gray-800/60 border-gray-700/50">
        <CardContent className="py-12 text-center">
          <FaTrophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No videos ranked yet.</p>
        </CardContent>
      </Card>
    )
  }

  const medalColors = ['text-amber-400', 'text-gray-300', 'text-amber-700']

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={rankBy} onValueChange={(v) => setRankBy(v as 'engagement_rate' | 'views' | 'likes')}>
          <SelectTrigger className="w-48 bg-gray-800/60 border-gray-700/50 text-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="engagement_rate">Engagement Rate</SelectItem>
            <SelectItem value="views">Views</SelectItem>
            <SelectItem value="likes">Likes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {ranked.map((v, idx) => (
          <Card key={v.id} className={`bg-gray-800/60 border-gray-700/50 ${idx < 3 ? 'ring-1 ring-amber-500/20' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-900/60 flex items-center justify-center shrink-0">
                  {idx < 3 ? (
                    <FaMedal className={`w-5 h-5 ${medalColors[idx]}`} />
                  ) : (
                    <span className="text-sm font-bold text-gray-500">#{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getPlatformBadgeClass(v.platform)}`}>
                      {getPlatformIcon(v.platform)} {v.platform}
                    </span>
                    <span className="text-sm font-medium text-gray-200">{v.influencer_name}</span>
                    <span className="text-xs text-gray-500">{v.influencer_handle}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{v.video_title || v.campaign || 'Untitled'}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
                  <div>
                    <p className="text-xs text-gray-500">Views</p>
                    <p className="text-sm font-medium text-gray-300">{formatNumber(v.views)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Likes</p>
                    <p className="text-sm font-medium text-gray-300">{formatNumber(v.likes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Eng%</p>
                    <p className="text-sm font-bold text-amber-400">{(v.engagement_rate || 0).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reach</p>
                    <p className="text-sm font-medium text-gray-300">{formatNumber(v.estimated_reach)}</p>
                  </div>
                </div>
                <div className="sm:hidden text-right shrink-0">
                  <p className="text-lg font-bold text-amber-400">
                    {rankBy === 'engagement_rate'
                      ? (v.engagement_rate || 0).toFixed(1) + '%'
                      : formatNumber(Number(v[rankBy]) || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---- MAIN PAGE ----

export default function Page() {
  const [videos, setVideos] = useState<VideoMetrics[]>([])
  const [showSample, setShowSample] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [campaign, setCampaign] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestResult, setLatestResult] = useState<VideoMetrics | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setVideos(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (mounted && !showSample) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(videos))
      } catch {
        // ignore
      }
    }
  }, [videos, mounted, showSample])

  const displayVideos = showSample ? SAMPLE_DATA : videos

  const analyzeVideo = useCallback(async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a video URL')
      return
    }
    if (!campaign.trim()) {
      setError('Please enter a campaign name')
      return
    }

    setLoading(true)
    setError(null)
    setLatestResult(null)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(
        `Analyze this video URL and return engagement metrics: ${videoUrl.trim()}`,
        AGENT_ID
      )

      if (result.success) {
        let data = result?.response?.result

        // Handle nested responses
        if (data && typeof data === 'object') {
          if (!data.platform && data.result) {
            data = data.result
          }
          if (!data.platform && data.response) {
            data = typeof data.response === 'string' ? JSON.parse(data.response) : data.response
            if (data?.result) data = data.result
          }
        }

        if (data && data.platform) {
          const newEntry: VideoMetrics = {
            id: generateId(),
            platform: data.platform || 'Unknown',
            influencer_name: data.influencer_name || 'Unknown',
            influencer_handle: data.influencer_handle || '',
            video_title: data.video_title || '',
            video_url: data.video_url || videoUrl.trim(),
            views: Number(data.views) || 0,
            likes: Number(data.likes) || 0,
            comments: Number(data.comments) || 0,
            shares: Number(data.shares) || 0,
            engagement_rate: Number(data.engagement_rate) || 0,
            estimated_reach: Number(data.estimated_reach) || 0,
            estimated_impressions: Number(data.estimated_impressions) || 0,
            is_estimated: Boolean(data.is_estimated),
            analysis_summary: data.analysis_summary || '',
            campaign: campaign.trim(),
            dateAdded: new Date().toISOString(),
          }
          setLatestResult(newEntry)
          setVideos(prev => [newEntry, ...prev])
          setVideoUrl('')
        } else {
          setError('Unable to parse response. The agent did not return expected metrics data.')
        }
      } else {
        setError(result?.error || 'Analysis failed. Please try again.')
      }
    } catch (err) {
      setError('Failed to analyze video. Please check the URL and try again.')
    }

    setLoading(false)
    setActiveAgentId(null)
  }, [videoUrl, campaign])

  const deleteVideo = useCallback((id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id))
    if (latestResult?.id === id) setLatestResult(null)
  }, [latestResult])

  const clearAllData = useCallback(() => {
    setVideos([])
    setLatestResult(null)
    setClearDialogOpen(false)
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
  }, [])

  const exportCSV = useCallback(() => {
    const target = showSample ? SAMPLE_DATA : videos
    if (target.length === 0) return
    const headers = ['Date Added', 'Platform', 'Influencer', 'Handle', 'Video Title', 'Video URL', 'Campaign', 'Views', 'Likes', 'Comments', 'Shares', 'Engagement Rate', 'Reach', 'Impressions', 'Estimated']
    const rows = target.map(v => [
      v.dateAdded, v.platform, v.influencer_name, v.influencer_handle, v.video_title, v.video_url, v.campaign,
      v.views, v.likes, v.comments, v.shares, v.engagement_rate, v.estimated_reach, v.estimated_impressions, v.is_estimated
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `influencer_tracker_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [videos, showSample])

  const existingCampaigns = useMemo(() => [...new Set(videos.map(v => v.campaign).filter(Boolean))], [videos])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        {/* HEADER */}
        <header className="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <FaVideo className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-100">Influencer Campaign Video Tracker</h1>
                  <p className="text-xs text-gray-500">Track video performance across Twitter, Instagram, and TikTok</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sample-toggle" className="text-xs text-gray-400 cursor-pointer">Sample Data</Label>
                  <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
                </div>
                <Button variant="outline" size="sm" onClick={exportCSV} disabled={displayVideos.length === 0} className="hidden sm:flex items-center gap-1.5 border-gray-700 text-gray-300 hover:bg-gray-800">
                  <FaDownload className="w-3 h-3" /> Export
                </Button>
                <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={videos.length === 0} className="hidden sm:flex items-center gap-1.5 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-red-400">
                      <FaTrash className="w-3 h-3" /> Clear
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-gray-100">Clear All Data</DialogTitle>
                      <DialogDescription className="text-gray-400">This will permanently delete all {videos.length} tracked videos. This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setClearDialogOpen(false)} className="border-gray-700 text-gray-300">Cancel</Button>
                      <Button variant="destructive" onClick={clearAllData}>Delete All</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* VIDEO INPUT SECTION */}
          <Card className="bg-gray-800/60 border-gray-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                <FaPlus className="w-3.5 h-3.5 text-blue-400" /> Analyze Video
              </CardTitle>
              <CardDescription className="text-gray-400">Paste a video URL from Twitter/X, Instagram, or TikTok to fetch engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Paste video URL (e.g. https://x.com/user/status/12345)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-gray-900/60 border-gray-700/50 text-gray-200 placeholder:text-gray-500"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !loading) analyzeVideo() }}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Campaign name"
                      value={campaign}
                      onChange={(e) => setCampaign(e.target.value)}
                      disabled={loading}
                      list="campaign-list"
                      className="w-full sm:w-48 bg-gray-900/60 border-gray-700/50 text-gray-200 placeholder:text-gray-500"
                    />
                    <datalist id="campaign-list">
                      {existingCampaigns.map(c => <option key={c} value={c} />)}
                    </datalist>
                    <Button onClick={analyzeVideo} disabled={loading || !videoUrl.trim() || !campaign.trim()} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Analyzing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2"><FaSearch className="w-3.5 h-3.5" /> Analyze</span>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><FaTwitter className="w-3 h-3 text-blue-400" /> Twitter/X</span>
                  <span className="flex items-center gap-1"><FaInstagram className="w-3 h-3 text-pink-400" /> Instagram</span>
                  <span className="flex items-center gap-1"><FaTiktok className="w-3 h-3 text-red-400" /> TikTok</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ERROR STATE */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <FaInfoCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-400 hover:text-red-300 h-6 w-6 p-0 shrink-0">
                <FaTimes className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* LOADING INDICATOR */}
          {loading && (
            <Card className="bg-gray-800/60 border-gray-700/50">
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-3">
                  <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm text-gray-400">Analyzing video metrics using AI search...</p>
                  <p className="text-xs text-gray-600">This may take a moment while we fetch real-time data</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* LATEST RESULT */}
          {latestResult && !loading && (
            <LatestResultCard video={latestResult} onClose={() => setLatestResult(null)} />
          )}

          {/* MAIN TABS */}
          <Tabs defaultValue="overview" className="space-y-4">
            <ScrollArea className="w-full pb-2">
              <TabsList className="bg-gray-800/60 border border-gray-700/50 h-auto flex-wrap gap-1 p-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm px-2 sm:px-3">
                  <FaChartBar className="w-3 h-3 mr-1.5" /> Overview
                </TabsTrigger>
                <TabsTrigger value="videos" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm px-2 sm:px-3">
                  <FaVideo className="w-3 h-3 mr-1.5" /> Videos
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm px-2 sm:px-3">
                  <FaFilter className="w-3 h-3 mr-1.5" /> Campaigns
                </TabsTrigger>
                <TabsTrigger value="influencers" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm px-2 sm:px-3">
                  <FaUsers className="w-3 h-3 mr-1.5" /> Influencers
                </TabsTrigger>
                <TabsTrigger value="platforms" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm px-2 sm:px-3">
                  <FaGlobe className="w-3 h-3 mr-1.5" /> Platforms
                </TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm px-2 sm:px-3">
                  <FaChartLine className="w-3 h-3 mr-1.5" /> Timeline
                </TabsTrigger>
                <TabsTrigger value="rankings" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm px-2 sm:px-3">
                  <FaTrophy className="w-3 h-3 mr-1.5" /> Rankings
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

            <TabsContent value="overview">
              <DashboardOverview videos={displayVideos} />
            </TabsContent>

            <TabsContent value="videos">
              <VideosTable videos={displayVideos} onDelete={showSample ? () => {} : deleteVideo} />
            </TabsContent>

            <TabsContent value="campaigns">
              <CampaignsView videos={displayVideos} />
            </TabsContent>

            <TabsContent value="influencers">
              <InfluencerComparison videos={displayVideos} />
            </TabsContent>

            <TabsContent value="platforms">
              <PlatformComparison videos={displayVideos} />
            </TabsContent>

            <TabsContent value="timeline">
              <TimelineView videos={displayVideos} />
            </TabsContent>

            <TabsContent value="rankings">
              <RankingsView videos={displayVideos} />
            </TabsContent>
          </Tabs>

          {/* AGENT STATUS */}
          <Card className="bg-gray-800/40 border-gray-700/30">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaCog className="w-3.5 h-3.5 text-gray-500" />
                  <div>
                    <p className="text-xs font-medium text-gray-400">Powered by AI Agent</p>
                    <p className="text-xs text-gray-600">Video Metrics Analyzer - Perplexity Sonar Pro (real-time web search)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                  <span className="text-xs text-gray-500">{activeAgentId ? 'Active' : 'Idle'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ErrorBoundary>
  )
}
