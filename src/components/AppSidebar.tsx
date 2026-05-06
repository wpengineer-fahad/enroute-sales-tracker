import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, ListChecks, Package, UserCog, BarChart3, Upload, Building2, LogOut,
  ShieldCheck, ShieldPlus, ShoppingCart, TrendingUp,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, user, signOut } = useAuth();
  const location = useLocation();

  const adminItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "ME Profiles", url: "/profiles", icon: Users },
    { title: "Master Tasks", url: "/master-tasks", icon: ListChecks },
    { title: "Master Products", url: "/master-products", icon: Package },
    { title: "Orders", url: "/orders", icon: ShoppingCart },
    { title: "Developers", url: "/developers", icon: UserCog },
    { title: "Sub-Sectors", url: "/sub-sectors", icon: BarChart3 },
    { title: "Bulk Import", url: "/import", icon: Upload },
    { title: "User Approvals", url: "/user-approvals", icon: ShieldCheck },
    { title: "Create Admin", url: "/create-admin", icon: ShieldPlus },
  ];
  const devItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "My MEs", url: "/profiles", icon: Users },
    { title: "Orders", url: "/orders", icon: ShoppingCart },
  ];
  const meItems = [
    { title: "My Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "My Profile", url: "/me", icon: Building2 },
    { title: "My Orders", url: "/orders", icon: ShoppingCart },
  ];

  const items = role === "admin" ? adminItems : role === "developer" ? devItems : meItems;
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            ST
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-semibold text-sm text-sidebar-foreground truncate">Sales Tracker</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{role && ROLE_LABEL[role]}</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <div className="px-2 py-1 text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="text-sidebar-foreground hover:bg-sidebar-accent justify-start">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
