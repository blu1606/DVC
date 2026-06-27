import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))

from agent_server import _bridge_matches_request_context


class AgentServerHelperTest(unittest.TestCase):
    def test_bridge_context_matches_same_page_url(self):
        read_result = {
            "status": "success",
            "page": {"url": "http://localhost:8088/test-dvc-cascading.html"},
        }

        self.assertTrue(
            _bridge_matches_request_context(
                "http://localhost:8088/test-dvc-cascading.html",
                read_result,
            )
        )

    def test_bridge_context_rejects_different_page_url(self):
        read_result = {
            "status": "success",
            "page": {"url": "https://dichvucong.gdt.gov.vn/tthc/home"},
        }

        self.assertFalse(
            _bridge_matches_request_context(
                "http://localhost:8088/test-dvc-cascading.html",
                read_result,
            )
        )


if __name__ == "__main__":
    unittest.main()
