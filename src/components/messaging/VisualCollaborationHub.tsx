/**
 * VisualCollaborationHub Component
 * Central hub for visual collaboration with multi-user design review capabilities
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Screen,
  MessageSquare,
  Eye,
  Volume2,
  VolumeX,
  PhoneOff,
  Record,
  StopCircle,
  Maximize2,
  Minimize2,
  Grid3X3,
  Focus,
  Palette,
  Clock,
  CheckCircle,
  Upload,
  Wifi,
  WifiOff,
  Crown,
  UserPlus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Progress } from '../ui/progress';
import { RealtimeImageAnnotation } from './RealtimeImageAnnotation';
import { VersionAwareMessaging } from './VersionAwareMessaging';
import { MessageUser, ImageAnnotation } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface CollaborationSession {
  id: string;
  title: string;
  type: 'design_review' | 'brainstorm' | 'presentation' | 'workshop';
  status: 'scheduled' | 'active' | 'paused' | 'completed';
  host: MessageUser;
  participants: SessionParticipant[];
  assets: SessionAsset[];
  startTime: Date;
  duration: number;
  isRecording: boolean;
  recordingUrl?: string;
  settings: SessionSettings;
}

interface SessionParticipant {
  user: MessageUser;
  role: 'host' | 'presenter' | 'reviewer' | 'observer';
  permissions: ParticipantPermissions;
  status: 'connected' | 'disconnected' | 'away';
  joinedAt: Date;
  lastActivity: Date;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  hasVideo: boolean;
  hasAudio: boolean;
  isScreenSharing: boolean;
  cursor?: { x: number; y: number };
}

interface ParticipantPermissions {
  canAnnotate: boolean;
  canScreenShare: boolean;
  canControlSession: boolean;
  canInviteOthers: boolean;
  canRecord: boolean;
  canUploadAssets: boolean;
}

interface SessionAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'design_file';
  url: string;
  thumbnailUrl?: string;
  uploadedBy: MessageUser;
  uploadedAt: Date;
  annotations: ImageAnnotation[];
  isActive: boolean;
  version?: string;
}

interface SessionSettings {
  allowAnnotations: boolean;
  allowScreenSharing: boolean;
  allowRecording: boolean;
  requireApprovalToJoin: boolean;
  maxParticipants: number;
  audioEnabled: boolean;
  videoEnabled: boolean;
  chatEnabled: boolean;
  whiteboardEnabled: boolean;
}

interface VisualCollaborationHubProps {
  sessionId?: string;
  currentUser: MessageUser;
  className?: string;
  onSessionEnd?: () => void;
  onParticipantAdd?: (user: MessageUser) => void;
  onAssetUpload?: (file: File) => void;
}

// Mock session data
const mockSession: CollaborationSession = {
  id: 'session-1',
  title: 'Logo Design Review - Final Concepts',
  type: 'design_review',
  status: 'active',
  host: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
  participants: [
    {
      user: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
      role: 'host',
      permissions: {
        canAnnotate: true,
        canScreenShare: true,
        canControlSession: true,
        canInviteOthers: true,
        canRecord: true,
        canUploadAssets: true
      },
      status: 'connected',
      joinedAt: new Date(Date.now() - 30 * 60000),
      lastActivity: new Date(),
      connectionQuality: 'excellent',
      hasVideo: true,
      hasAudio: true,
      isScreenSharing: false,
      cursor: { x: 100, y: 100 }
    },
    {
      user: { id: 'u2', name: 'John Client', userType: 'client', avatar: '/mock/john.jpg' },
      role: 'reviewer',
      permissions: {
        canAnnotate: true,
        canScreenShare: false,
        canControlSession: false,
        canInviteOthers: false,
        canRecord: false,
        canUploadAssets: false
      },
      status: 'connected',
      joinedAt: new Date(Date.now() - 25 * 60000),
      lastActivity: new Date(Date.now() - 2 * 60000),
      connectionQuality: 'good',
      hasVideo: true,
      hasAudio: true,
      isScreenSharing: false,
      cursor: { x: 200, y: 150 }
    },
    {
      user: { id: 'u3', name: 'Mike Manager', userType: 'client', avatar: '/mock/mike.jpg' },
      role: 'observer',
      permissions: {
        canAnnotate: false,
        canScreenShare: false,
        canControlSession: false,
        canInviteOthers: false,
        canRecord: false,
        canUploadAssets: false
      },
      status: 'connected',
      joinedAt: new Date(Date.now() - 15 * 60000),
      lastActivity: new Date(Date.now() - 1 * 60000),
      connectionQuality: 'fair',
      hasVideo: false,
      hasAudio: true,
      isScreenSharing: false
    }
  ],
  assets: [
    {
      id: 'asset-1',
      name: 'logo-concept-v3.png',
      type: 'image',
      url: '/mock/logo-v3.png',
      thumbnailUrl: '/mock/logo-v3-thumb.png',
      uploadedBy: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
      uploadedAt: new Date(Date.now() - 10 * 60000),
      annotations: [],
      isActive: true,
      version: 'v3.0'
    }
  ],
  startTime: new Date(Date.now() - 30 * 60000),
  duration: 60,
  isRecording: false,
  settings: {
    allowAnnotations: true,
    allowScreenSharing: true,
    allowRecording: true,
    requireApprovalToJoin: false,
    maxParticipants: 10,
    audioEnabled: true,
    videoEnabled: true,
    chatEnabled: true,
    whiteboardEnabled: true
  }
};

export function VisualCollaborationHub({
  sessionId: _sessionId,
  currentUser,
  className,
  onSessionEnd,
  onParticipantAdd: _onParticipantAdd,
  onAssetUpload
}: VisualCollaborationHubProps) {
  const [session, setSession] = useState<CollaborationSession>(mockSession);
  const [activeAsset, setActiveAsset] = useState<string>(session.assets[0]?.id);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'focus' | 'grid' | 'presentation'>('focus');
  const [showParticipants, setShowParticipants] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [isConnected, _setIsConnected] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);

  // User controls
  const [hasVideo, setHasVideo] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [volume, setVolume] = useState(80);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(Date.now() - session.startTime.getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  const formatDuration = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const currentParticipant = useMemo(() => {
    return session.participants.find(p => p.user.id === currentUser.id);
  }, [session.participants, currentUser.id]);

  const activeAssetData = useMemo(() => {
    return session.assets.find(asset => asset.id === activeAsset);
  }, [session.assets, activeAsset]);

  const connectedParticipants = useMemo(() => {
    return session.participants.filter(p => p.status === 'connected');
  }, [session.participants]);

  const handleToggleVideo = () => {
    setHasVideo(!hasVideo);
    // Update participant state
    setSession(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.user.id === currentUser.id ? { ...p, hasVideo: !hasVideo } : p
      )
    }));
  };

  const handleToggleAudio = () => {
    setHasAudio(!hasAudio);
    setSession(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.user.id === currentUser.id ? { ...p, hasAudio: !hasAudio } : p
      )
    }));
  };

  const handleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    setSession(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.user.id === currentUser.id ? { ...p, isScreenSharing: !isScreenSharing } : p
      )
    }));
  };

  const handleStartRecording = () => {
    setSession(prev => ({ ...prev, isRecording: true }));
  };

  const handleStopRecording = () => {
    setSession(prev => ({ ...prev, isRecording: false }));
  };

  const handleInviteParticipant = () => {
    // Copy session invite link
    navigator.clipboard.writeText(`${window.location.origin}/collaborate/${session.id}`);
  };

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'host': return Crown;
      case 'presenter': return Screen;
      case 'reviewer': return Eye;
      case 'observer': return Users;
      default: return Users;
    }
  };

  const ParticipantCard = ({ participant }: { participant: SessionParticipant }) => {
    const RoleIcon = getRoleIcon(participant.role);

    return (
      <Card className="mb-3">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={participant.user.avatar} />
                <AvatarFallback>
                  {participant.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                participant.status === 'connected' ? 'bg-green-500' :
                participant.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">
                  {participant.user.name}
                </h4>
                <RoleIcon className="w-3 h-3 text-gray-500" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {participant.role}
                </Badge>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getConnectionQualityColor(participant.connectionQuality)
                )} />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {participant.hasVideo ? (
                <Video className="w-4 h-4 text-green-500" />
              ) : (
                <VideoOff className="w-4 h-4 text-gray-400" />
              )}
              {participant.hasAudio ? (
                <Mic className="w-4 h-4 text-green-500" />
              ) : (
                <MicOff className="w-4 h-4 text-gray-400" />
              )}
              {participant.isScreenSharing && (
                <Screen className="w-4 h-4 text-blue-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-gray-900 text-white",
      isFullscreen && "fixed inset-0 z-50",
      className
    )}>
      {/* Header */}
      <Card className="border-b border-gray-700 bg-gray-800 rounded-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div>
                <CardTitle className="text-lg text-white">{session.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(sessionTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {connectedParticipants.length} connected
                  </span>
                  {session.isRecording && (
                    <Badge className="bg-red-600 text-white">
                      <Record className="w-3 h-3 mr-1" />
                      Recording
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className="flex items-center gap-2 text-sm">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-gray-400">
                  {isConnected ? 'Connected' : 'Reconnecting...'}
                </span>
              </div>

              {/* View Mode Controls */}
              <div className="flex border border-gray-600 rounded">
                <Button
                  variant={viewMode === 'focus' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('focus')}
                  className="rounded-r-none"
                >
                  <Focus className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-x border-gray-600"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'presentation' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('presentation')}
                  className="rounded-l-none"
                >
                  <Screen className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Participants Sidebar */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-gray-700 bg-gray-800 overflow-hidden"
            >
              <div className="p-4 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    Participants ({connectedParticipants.length})
                  </h3>
                  <Button
                    size="sm"
                    onClick={handleInviteParticipant}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Invite
                  </Button>
                </div>

                <ScrollArea className="h-full">
                  {session.participants.map(participant => (
                    <ParticipantCard key={participant.user.id} participant={participant} />
                  ))}
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Asset Navigation */}
          {session.assets.length > 1 && (
            <div className="border-b border-gray-700 bg-gray-800 p-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Assets:</span>
                <div className="flex gap-2">
                  {session.assets.map(asset => (
                    <Button
                      key={asset.id}
                      variant={activeAsset === asset.id ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setActiveAsset(asset.id)}
                      className="text-xs"
                    >
                      {asset.name}
                      {asset.version && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {asset.version}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 relative">
            {activeAssetData && activeAssetData.type === 'image' ? (
              <RealtimeImageAnnotation
                imageUrl={activeAssetData.url}
                annotations={activeAssetData.annotations}
                currentUser={currentUser}
                onAnnotationsChange={(annotations) => {
                  setSession(prev => ({
                    ...prev,
                    assets: prev.assets.map(asset =>
                      asset.id === activeAsset ? { ...asset, annotations } : asset
                    )
                  }));
                }}
                conversationId={session.id}
                fileVersionId={activeAsset}
                collaborators={connectedParticipants.map(p => p.user)}
                className="h-full bg-gray-900"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Active Asset</h3>
                  <p className="text-sm">
                    Upload or select an asset to start collaborating
                  </p>
                  <Button
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Asset
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,video/*,.pdf,.figma"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onAssetUpload?.(file);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 350, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-700 bg-gray-800 overflow-hidden"
            >
              <Tabs defaultValue="chat" className="h-full flex flex-col">
                <div className="border-b border-gray-700">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="chat" className="flex-1 m-0">
                  <VersionAwareMessaging
                    conversationId={session.id}
                    currentUser={currentUser}
                    className="h-full"
                  />
                </TabsContent>

                <TabsContent value="history" className="flex-1 m-0 p-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Session History</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Session started</span>
                        <span className="text-gray-400 ml-auto">
                          {formatDuration(sessionTime)} ago
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <UserPlus className="w-4 h-4 text-blue-500" />
                        <span>John Client joined</span>
                        <span className="text-gray-400 ml-auto">
                          25m ago
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Upload className="w-4 h-4 text-purple-500" />
                        <span>Asset uploaded</span>
                        <span className="text-gray-400 ml-auto">
                          20m ago
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar */}
      <Card className="border-t border-gray-700 bg-gray-800 rounded-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Media Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={hasVideo ? 'primary' : 'danger'}
                size="sm"
                onClick={handleToggleVideo}
              >
                {hasVideo ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              <Button
                variant={hasAudio ? 'primary' : 'danger'}
                size="sm"
                onClick={handleToggleAudio}
              >
                {hasAudio ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>

              {currentParticipant?.permissions.canScreenShare && (
                <Button
                  variant={isScreenSharing ? 'primary' : 'outline'}
                  size="sm"
                  onClick={handleScreenShare}
                >
                  <Screen className="w-4 h-4" />
                </Button>
              )}

              {/* Volume Control */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60">
                  <div className="space-y-2">
                    <Label>Volume</Label>
                    <Slider
                      value={[volume]}
                      onValueChange={(value) => setVolume(value[0])}
                      max={100}
                      step={5}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Session Controls */}
            <div className="flex items-center gap-2">
              {currentParticipant?.permissions.canRecord && (
                <Button
                  variant={session.isRecording ? 'danger' : 'outline'}
                  size="sm"
                  onClick={session.isRecording ? handleStopRecording : handleStartRecording}
                >
                  {session.isRecording ? (
                    <StopCircle className="w-4 h-4" />
                  ) : (
                    <Record className="w-4 h-4" />
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
              >
                <Users className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={onSessionEnd}
              >
                <PhoneOff className="w-4 h-4" />
                Leave
              </Button>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400">
                Session Quality: <span className="text-green-400">Excellent</span>
              </div>
              <Progress value={85} className="w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VisualCollaborationHub;