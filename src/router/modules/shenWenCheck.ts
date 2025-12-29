import { $t } from "@/plugins/i18n";
import { shenWenCheck } from "@/router/enums";

export default {
  path: "/shenwen-check",
  redirect: "/shenwen-check/index",
  meta: {
    icon: "ri/bar-chart-horizontal-line",
    title: $t("menus.shenwenCheck"),
    rank: shenWenCheck
  },
  children: [
    {
      path: "/shenwen-check/awkFactory",
      name: "shenWenCheck-awkForHighDegree",
      component: () => import("@/views/shenwen-check/awkFactory/index.vue"),
      meta: {
        title: $t("menus.shenwenCheck-awkForHighDegree")
      }
    },
    {
      path: "/shenwen-check/baseCiTiaoTableCheck",
      name: "shenwenCheck-baseCiTiaoTableCheck",
      component: () =>
        import("@/views/shenwen-check/baseCiTiaoTableCheck/index.vue"),
      meta: {
        title: $t("menus.shenwenCheck-baseCiTiaoTableCheck"),
        keepAlive: true
      }
    }
  ]
} satisfies RouteConfigsTable;
