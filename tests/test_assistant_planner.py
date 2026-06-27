import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))

from assistant_planner import build_action_plan, build_preflight_state


MOCK_DVC_DOM = {
    "status": "success",
    "page": {
        "title": "Trang mô phỏng Dịch vụ công Quốc gia",
        "url": "http://localhost:8080/test-dvc-cascading.html",
        "mode": "ephemeral",
        "pageState": "unknown",
        "formFields": [
            {"label": "Họ và tên người nộp", "selector": "input#fullname"},
            {"label": "Ngày tháng năm sinh", "selector": "input#birthday"},
            {"label": "Số định danh/CCCD", "selector": "input#cccd-num"},
            {"label": "Số điện thoại liên hệ", "selector": "input#phone"},
            {"label": "Tỉnh/Thành phố", "selector": "select#prov"},
            {"label": "Quận/Huyện", "selector": "select#dist"},
            {"label": "Xã/Phường", "selector": "select#ward"},
            {"label": "Địa chỉ chi tiết", "selector": "input#address"},
        ],
        "buttons": [
            {"text": "Nộp hồ sơ thường trú", "selector": "button#btn-submit"},
        ],
    },
}


class AssistantPlannerHappyCaseTest(unittest.TestCase):
    def test_happy_case_demo_builds_auto_execute_plan_without_submit(self):
        preflight = build_preflight_state(
            "chạy demo happy case điền hồ sơ thường trú",
            MOCK_DVC_DOM,
            login_result={"status": "success", "logged_in": True},
            current_url="http://localhost:8080/test-dvc-cascading.html",
        )

        plan = build_action_plan("chạy demo happy case điền hồ sơ thường trú", preflight)

        self.assertIsNotNone(plan)
        self.assertTrue(plan["auto_execute"])
        tools = [step["tool"] for step in plan["steps"]]
        self.assertIn("bulk_fill_profile", tools)
        self.assertIn("fill_address_cascade", tools)
        self.assertNotIn("click_element", tools)
        address_step = next(step for step in plan["steps"] if step["tool"] == "fill_address_cascade")
        self.assertEqual(
            address_step["payload"],
            {
                "province": "Hà Nội",
                "district": "Cầu Giấy",
                "ward": "Dịch Vọng Hậu",
            },
        )
        self.assertIn("chưa bấm Nộp hồ sơ", plan["reply"])


if __name__ == "__main__":
    unittest.main()
