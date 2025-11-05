'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  FileText,
  Settings,
  PlusCircle,
  BarChart3,
  User,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '../ui/sidebar';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const menuItems = [
  {
    title: 'Posts',
    icon: FileText,
    items: [
      { title: 'All Posts', href: '/posts', tooltip: 'View and manage all blog posts' },
      { title: 'Add New Post', href: '/posts/new', icon: PlusCircle, tooltip: 'Create a new blog post' },
    ],
  },
  {
    title: 'Management',
    icon: BarChart3,
    items: [
      { title: 'Categories', href: '/categories', tooltip: 'Organize posts with categories' },
      { title: 'Tags', href: '/tags', tooltip: 'Manage post tags for better organization' },
      { title: 'Media Library', href: '/media', tooltip: 'Upload and manage images and files' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    items: [
      { title: 'Profile', href: '/settings/profile', tooltip: 'Update your profile information' },
      { title: 'API Tokens', href: '/settings/tokens', tooltip: 'Manage API access tokens' },
      { title: 'Redirects', href: '/settings/redirects', tooltip: 'Manage post redirects for content consolidation and URL changes' },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <TooltipProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">TugasCMS</h2>
              <p className="text-sm text-muted-foreground">Content Management</p>
            </div>
          </div>
        </SidebarHeader>

      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="flex items-center gap-2">
              <group.icon className="w-4 h-4" />
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = pathname === item.href || 
                                 (item.href === '/posts' && pathname?.startsWith('/posts'));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton 
                            asChild
                            isActive={isActive}
                          >
                            <Link href={item.href}>
                              {ItemIcon && <ItemIcon className="w-4 h-4" />}
                              {item.title}
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.fullName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sign out</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}