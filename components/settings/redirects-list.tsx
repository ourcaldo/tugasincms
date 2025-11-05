'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Plus, MoreHorizontal, Trash, Edit, ExternalLink, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useApiClient } from '../../lib/api-client'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import type { PostRedirect } from '../../types'

interface RedirectWithRelations extends PostRedirect {
  source_post?: {
    id: string
    title: string
    slug: string
    status: string
  } | null
  target_post?: {
    id: string
    title: string
    slug: string
    status: string
  } | null
}

export function RedirectsList() {
  const [redirects, setRedirects] = useState<RedirectWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'post' | 'url'>('all')
  const [search, setSearch] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRedirect, setEditingRedirect] = useState<RedirectWithRelations | null>(null)
  const [formData, setFormData] = useState({
    sourcePostId: '',
    redirectType: 'post' as 'post' | 'url',
    targetPostId: '',
    targetUrl: '',
    httpStatusCode: 301,
    notes: '',
  })
  const [posts, setPosts] = useState<Array<{ id: string; title: string; slug: string }>>([])
  const apiClient = useApiClient()

  useEffect(() => {
    fetchRedirects()
    fetchPosts()
  }, [])

  const fetchRedirects = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{
        success: boolean
        data: { redirects: RedirectWithRelations[] }
      }>('/settings/redirects')
      setRedirects(response.data.redirects || [])
    } catch (error) {
      toast.error('Failed to load redirects')
      setRedirects([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean
        data: Array<{ id: string; title: string; slug: string }>
      }>('/posts')
      setPosts(response.data || [])
    } catch (error) {
      setPosts([])
    }
  }

  const handleCreateRedirect = async () => {
    if (!formData.sourcePostId) {
      toast.error('Source post is required')
      return
    }

    if (formData.redirectType === 'post' && !formData.targetPostId) {
      toast.error('Target post is required')
      return
    }

    if (formData.redirectType === 'url' && !formData.targetUrl) {
      toast.error('Target URL is required')
      return
    }

    try {
      setLoading(true)
      const payload: any = {
        sourcePostId: formData.sourcePostId,
        redirectType: formData.redirectType,
        httpStatusCode: formData.httpStatusCode,
        notes: formData.notes,
      }

      if (formData.redirectType === 'post') {
        payload.targetPostId = formData.targetPostId
      } else {
        payload.targetUrl = formData.targetUrl
      }

      await apiClient.post('/settings/redirects', payload)
      await fetchRedirects()
      setFormData({
        sourcePostId: '',
        redirectType: 'post',
        targetPostId: '',
        targetUrl: '',
        httpStatusCode: 301,
        notes: '',
      })
      setIsCreateDialogOpen(false)
      toast.success('Redirect created successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create redirect')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRedirect = async () => {
    if (!editingRedirect) return

    try {
      setLoading(true)
      const payload: any = {
        httpStatusCode: formData.httpStatusCode,
        notes: formData.notes,
      }

      if (formData.redirectType === 'post') {
        payload.redirectType = 'post'
        payload.targetPostId = formData.targetPostId
      } else {
        payload.redirectType = 'url'
        payload.targetUrl = formData.targetUrl
      }

      await apiClient.put(`/settings/redirects/${editingRedirect.id}`, payload)
      await fetchRedirects()
      setEditingRedirect(null)
      setIsEditDialogOpen(false)
      toast.success('Redirect updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update redirect')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRedirect = async (redirectId: string) => {
    if (!confirm('Are you sure you want to delete this redirect?')) {
      return
    }

    try {
      setLoading(true)
      await apiClient.delete(`/settings/redirects/${redirectId}`)
      await fetchRedirects()
      toast.success('Redirect deleted successfully')
    } catch (error) {
      toast.error('Failed to delete redirect')
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (redirect: RedirectWithRelations) => {
    setEditingRedirect(redirect)
    setFormData({
      sourcePostId: redirect.sourcePostId,
      redirectType: redirect.redirectType,
      targetPostId: redirect.targetPostId || '',
      targetUrl: redirect.targetUrl || '',
      httpStatusCode: redirect.httpStatusCode,
      notes: redirect.notes || '',
    })
    setIsEditDialogOpen(true)
  }

  const filteredRedirects = redirects.filter(redirect => {
    if (filter !== 'all' && redirect.redirectType !== filter) return false
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        redirect.targetUrl?.toLowerCase().includes(searchLower) ||
        redirect.source_post?.title?.toLowerCase().includes(searchLower) ||
        redirect.target_post?.title?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Redirects ({filteredRedirects.length})</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Redirect
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Redirect</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="sourcePost">Source Post*</Label>
                  <Select
                    value={formData.sourcePostId}
                    onValueChange={(value) => setFormData({ ...formData, sourcePostId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source post" />
                    </SelectTrigger>
                    <SelectContent>
                      {posts.map((post) => (
                        <SelectItem key={post.id} value={post.id}>
                          {post.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Redirect Type*</Label>
                  <Tabs
                    value={formData.redirectType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, redirectType: value as 'post' | 'url' })
                    }
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="post">Post to Post</TabsTrigger>
                      <TabsTrigger value="url">Post to URL</TabsTrigger>
                    </TabsList>
                    <TabsContent value="post" className="mt-4">
                      <Label htmlFor="targetPost">Target Post*</Label>
                      <Select
                        value={formData.targetPostId}
                        onValueChange={(value) => setFormData({ ...formData, targetPostId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target post" />
                        </SelectTrigger>
                        <SelectContent>
                          {posts.filter(p => p.id !== formData.sourcePostId).map((post) => (
                            <SelectItem key={post.id} value={post.id}>
                              {post.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                    <TabsContent value="url" className="mt-4">
                      <Label htmlFor="targetUrl">Target URL*</Label>
                      <Input
                        id="targetUrl"
                        placeholder="https://example.com/article"
                        value={formData.targetUrl}
                        onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                <div>
                  <Label htmlFor="httpStatus">HTTP Status Code*</Label>
                  <Select
                    value={formData.httpStatusCode.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, httpStatusCode: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="301">301 - Permanent Redirect</SelectItem>
                      <SelectItem value="302">302 - Temporary Redirect</SelectItem>
                      <SelectItem value="307">307 - Temporary (Method Preserved)</SelectItem>
                      <SelectItem value="308">308 - Permanent (Method Preserved)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional notes about this redirect..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRedirect} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Redirect'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Search redirects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="post">Post to Post</SelectItem>
              <SelectItem value="url">Post to URL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading redirects...</div>
        ) : filteredRedirects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filter !== 'all' || search ? 'No redirects match your filters' : 'No redirects created yet'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status Code</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRedirects.map((redirect) => (
                <TableRow key={redirect.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {redirect.source_post?.title || 'Deleted Post'}
                        </div>
                        {!redirect.source_post && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Tombstone
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={redirect.redirectType === 'post' ? 'default' : 'secondary'}>
                      {redirect.redirectType === 'post' ? 'Post' : 'URL'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {redirect.redirectType === 'post' ? (
                      <div>
                        <div className="font-medium">
                          {redirect.target_post?.title || 'Target Deleted'}
                        </div>
                        {!redirect.target_post && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Broken
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <a
                        href={redirect.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {redirect.targetUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{redirect.httpStatusCode}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={redirect.notes}>
                    {redirect.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(redirect)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRedirect(redirect.id)}
                          className="text-destructive"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Redirect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Source Post</Label>
              <Input
                value={
                  posts.find(p => p.id === formData.sourcePostId)?.title || 'Unknown Post'
                }
                disabled
              />
            </div>

            <div>
              <Label>Redirect Type</Label>
              <Tabs
                value={formData.redirectType}
                onValueChange={(value) =>
                  setFormData({ ...formData, redirectType: value as 'post' | 'url' })
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="post">Post to Post</TabsTrigger>
                  <TabsTrigger value="url">Post to URL</TabsTrigger>
                </TabsList>
                <TabsContent value="post" className="mt-4">
                  <Label htmlFor="editTargetPost">Target Post*</Label>
                  <Select
                    value={formData.targetPostId}
                    onValueChange={(value) => setFormData({ ...formData, targetPostId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target post" />
                    </SelectTrigger>
                    <SelectContent>
                      {posts.filter(p => p.id !== formData.sourcePostId).map((post) => (
                        <SelectItem key={post.id} value={post.id}>
                          {post.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="url" className="mt-4">
                  <Label htmlFor="editTargetUrl">Target URL*</Label>
                  <Input
                    id="editTargetUrl"
                    placeholder="https://example.com/article"
                    value={formData.targetUrl}
                    onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <Label htmlFor="editHttpStatus">HTTP Status Code*</Label>
              <Select
                value={formData.httpStatusCode.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, httpStatusCode: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 - Permanent Redirect</SelectItem>
                  <SelectItem value="302">302 - Temporary Redirect</SelectItem>
                  <SelectItem value="307">307 - Temporary (Method Preserved)</SelectItem>
                  <SelectItem value="308">308 - Permanent (Method Preserved)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                placeholder="Optional notes about this redirect..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRedirect} disabled={loading}>
              {loading ? 'Updating...' : 'Update Redirect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}