import { $t } from "@/plugins/i18n";
import { recurionDrop } from "@/router/enums";

export default {
  path: "/recursion-drop",
  redirect: "/recursion-drop/index",
  meta: {
    icon: "ri/bar-chart-horizontal-line",
    title: $t("menus.allRecursionDrop"),
    rank: recurionDrop
  },
  children: [
    {
      path: "/recursion-drop/pure-recursion-drop",
      name: "pureRecurionDrop",
      component: () =>
        import("@/views/recursion-drop/pure-recursion/index.vue"),
      meta: {
        title: $t("menus.pureRecurionDrop")
      }
    },
    {
      path: "/recursion-drop/fake-box-check",
      name: "fakeBoxCheck",
      component: () => import("@/views/recursion-drop/fake-box/index.vue"),
      meta: {
        title: $t("menus.fakeBoxCheck")
      }
    }
  ]
} satisfies RouteConfigsTable;
