#!/usr/bin/env python3
"""Run Ozow payout certification tests and export a Word document report.

This utility automates the 9 standard payout checks and 3 mock-api checks
requested by Ozow certification. It stores full request/response JSON and
produces both a JSON artifact and a .docx report that can be shared.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

BASE_URL = "https://stagingpayoutsapi.ozow.com/v1"
MOCK_BASE_URL = "https://stagingpayoutsapi.ozow.com/mock/v1"
DEFAULT_BANK_GROUP_ID = "3284a0ad-ba78-4838-8c2b-102981286a2b"
DEFAULT_BRANCH_CODE = "632005"
DEFAULT_ACCOUNT = "4050338500"


@dataclass
class TestResult:
    name: str
    category: str
    status: str
    timestamp_utc: str
    request: Dict[str, Any]
    response_status: Optional[int]
    response_json: Optional[Dict[str, Any]]
    response_text: Optional[str]
    notes: str = ""


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def cents(amount: float) -> int:
    return int(round(float(amount) * 100))


def hash_request_payout(
    *,
    site_code: str,
    amount: float,
    merchant_reference: str,
    customer_bank_reference: str,
    is_rtc: bool,
    notify_url: str,
    bank_group_id: str,
    account_number: str,
    branch_code: str,
    api_key: str,
) -> str:
    raw = (
        f"{site_code}{cents(amount)}{merchant_reference}{customer_bank_reference}"
        f"{str(is_rtc).lower()}{notify_url}{bank_group_id}{account_number}{branch_code}{api_key}"
    )
    return hashlib.sha512(raw.lower().encode("utf-8")).hexdigest()


def hash_verify_payout(site_code: str, payout_id: str, api_key: str) -> str:
    raw = f"{site_code}{payout_id}{api_key}"
    return hashlib.sha512(raw.lower().encode("utf-8")).hexdigest()


def http_json(
    method: str,
    url: str,
    headers: Dict[str, str],
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    data = None
    final_headers = {"Accept": "application/json", **headers}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        final_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url=url, method=method, headers=final_headers, data=data)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode("utf-8")
            try:
                as_json = json.loads(body) if body else None
            except json.JSONDecodeError:
                as_json = None
            return {"status": resp.status, "json": as_json, "text": body}
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        try:
            as_json = json.loads(body) if body else None
        except json.JSONDecodeError:
            as_json = None
        return {"status": err.code, "json": as_json, "text": body}
    except urllib.error.URLError as err:
        return {"status": 0, "json": None, "text": str(err)}




def is_success_status(status: Optional[int]) -> bool:
    return status is not None and 0 < int(status) < 400


def build_request_payload(
    *,
    site_code: str,
    api_key: str,
    notify_url: str,
    verify_url: Optional[str],
    amount: float,
    account_number: str,
    bank_group_id: str,
    branch_code: str,
    merchant_reference_prefix: str,
) -> Dict[str, Any]:
    merchant_reference = f"{merchant_reference_prefix}-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    payload = {
        "SiteCode": site_code,
        "amount": amount,
        "merchantReference": merchant_reference,
        "customerBankReference": merchant_reference,
        "isRtc": False,
        "NotifyUrl": notify_url,
        "bankingDetails": {
            "bankGroupId": bank_group_id,
            "accountNumber": account_number,
            "branchCode": branch_code,
        },
    }
    if verify_url:
        payload["VerifyUrl"] = verify_url
    payload["hashCheck"] = hash_request_payout(
        site_code=site_code,
        amount=amount,
        merchant_reference=payload["merchantReference"],
        customer_bank_reference=payload["customerBankReference"],
        is_rtc=payload["isRtc"],
        notify_url=payload["NotifyUrl"],
        bank_group_id=bank_group_id,
        account_number=account_number,
        branch_code=branch_code,
        api_key=api_key,
    )
    return payload


def run_standard_tests(args: argparse.Namespace, report: List[TestResult]) -> Dict[str, Optional[str]]:
    headers = {"SiteCode": args.site_code, "ApiKey": args.api_key}

    payout_ids: Dict[str, Optional[str]] = {
        "success": None,
        "cancelled": None,
        "cdv_error": None,
    }

    standard_cases = [
        ("Request payout below minimum amount", 0.50, DEFAULT_ACCOUNT, "standard-min"),
        ("Request payout above maximum amount", 20.01, DEFAULT_ACCOUNT, "standard-max"),
    ]

    for name, amount, account, prefix in standard_cases:
        payload = build_request_payload(
            site_code=args.site_code,
            api_key=args.api_key,
            notify_url=args.notify_url,
            verify_url=args.verify_url,
            amount=amount,
            account_number=account,
            bank_group_id=args.bank_group_id,
            branch_code=args.branch_code,
            merchant_reference_prefix=prefix,
        )
        response = http_json("POST", f"{BASE_URL}/requestpayout", headers, payload)
        report.append(
            TestResult(
                name=name,
                category="standard",
                status="pass" if is_success_status(response["status"]) else "fail",
                status="pass" if response["status"] < 400 else "fail",
                timestamp_utc=now_utc(),
                request=payload,
                response_status=response["status"],
                response_json=response["json"],
                response_text=response["text"],
            )
        )

    # Success flow used by verification/complete/getpayout checks.
    success_payload = build_request_payload(
        site_code=args.site_code,
        api_key=args.api_key,
        notify_url=args.notify_url,
        verify_url=args.verify_url,
        amount=10.00,
        account_number=DEFAULT_ACCOUNT,
        bank_group_id=args.bank_group_id,
        branch_code=args.branch_code,
        merchant_reference_prefix="standard-success",
    )
    success_request = http_json("POST", f"{BASE_URL}/requestpayout", headers, success_payload)
    success_json = success_request.get("json") or {}
    payout_ids["success"] = success_json.get("payoutId")

    report.append(
        TestResult(
            name="Request payout success candidate",
            category="standard",
            status="pass" if is_success_status(success_request["status"]) else "fail",
            status="pass" if success_request["status"] < 400 else "fail",
            timestamp_utc=now_utc(),
            request=success_payload,
            response_status=success_request["status"],
            response_json=success_request["json"],
            response_text=success_request["text"],
            notes="Use returned payoutId for dashboard verification, verificationSuccess and payoutComplete checks.",
        )
    )

    if payout_ids["success"]:
        verify_payload = {
            "siteCode": args.site_code,
            "payoutId": payout_ids["success"],
            "hashCheck": hash_verify_payout(args.site_code, payout_ids["success"], args.api_key),
        }
        verify_response = http_json("POST", f"{BASE_URL}/verifypayout", headers, verify_payload)
        report.append(
            TestResult(
                name="Receive verification request and respond successfully",
                category="standard",
                status="pass" if is_success_status(verify_response["status"]) else "fail",
                status="pass" if verify_response["status"] < 400 else "fail",
                timestamp_utc=now_utc(),
                request=verify_payload,
                response_status=verify_response["status"],
                response_json=verify_response["json"],
                response_text=verify_response["text"],
            )
        )

        get_response = http_json(
            "GET",
            f"{BASE_URL}/getpayout?payoutId={urllib.parse.quote(payout_ids['success'])}",
            headers,
            None,
        )
        report.append(
            TestResult(
                name="Get payout status",
                category="standard",
                status="pass" if is_success_status(get_response["status"]) else "fail",
                status="pass" if get_response["status"] < 400 else "fail",
                timestamp_utc=now_utc(),
                request={"payoutId": payout_ids["success"]},
                response_status=get_response["status"],
                response_json=get_response["json"],
                response_text=get_response["text"],
            )
        )

        report.append(
            TestResult(
                name="Receive payout verification success message (notify URL)",
                category="standard",
                status="manual",
                timestamp_utc=now_utc(),
                request={"payoutId": payout_ids["success"], "notifyUrl": args.notify_url},
                response_status=None,
                response_json=None,
                response_text=None,
                notes="Manual dashboard evidence required under payout responses for verificationSuccess notification.",
            )
        )

        report.append(
            TestResult(
                name="Receive payout complete message",
                category="standard",
                status="manual",
                timestamp_utc=now_utc(),
                request={"payoutId": payout_ids["success"], "notifyUrl": args.notify_url},
                response_status=None,
                response_json=None,
                response_text=None,
                notes="Manual dashboard evidence required for payout completion notification.",
            )
        )

    cancel_payload = build_request_payload(
        site_code=args.site_code,
        api_key=args.api_key,
        notify_url=args.notify_url,
        verify_url=args.verify_url,
        amount=10.00,
        account_number=DEFAULT_ACCOUNT,
        bank_group_id=args.bank_group_id,
        branch_code=args.branch_code,
        merchant_reference_prefix="standard-cancel",
    )
    cancel_response = http_json("POST", f"{BASE_URL}/requestpayout", headers, cancel_payload)
    cancel_json = cancel_response.get("json") or {}
    payout_ids["cancelled"] = cancel_json.get("payoutId")

    report.append(
        TestResult(
            name="Receive payout cancelled message",
            category="standard",
            status="manual",
            timestamp_utc=now_utc(),
            request=cancel_payload,
            response_status=cancel_response["status"],
            response_json=cancel_response["json"],
            response_text=cancel_response["text"],
            notes="Cancellation outcome is asynchronous; confirm on dashboard and include payoutId evidence.",
        )
    )

    cdv_payload = build_request_payload(
        site_code=args.site_code,
        api_key=args.api_key,
        notify_url=args.notify_url,
        verify_url=args.verify_url,
        amount=10.00,
        account_number="1234567890",
        bank_group_id=args.bank_group_id,
        branch_code=args.branch_code,
        merchant_reference_prefix="standard-cdv",
    )
    cdv_response = http_json("POST", f"{BASE_URL}/requestpayout", headers, cdv_payload)
    cdv_json = cdv_response.get("json") or {}
    payout_ids["cdv_error"] = cdv_json.get("payoutId")

    report.append(
        TestResult(
            name="CDV error account number validation",
            category="standard",
            status="pass" if is_success_status(cdv_response["status"]) else "fail",
            status="pass" if cdv_response["status"] < 400 else "fail",
            timestamp_utc=now_utc(),
            request=cdv_payload,
            response_status=cdv_response["status"],
            response_json=cdv_response["json"],
            response_text=cdv_response["text"],
            notes="Confirm final CDV failure sub-status on dashboard for payoutId returned.",
        )
    )

    report.append(
        TestResult(
            name="Receive low float balance email alert",
            category="standard",
            status="manual",
            timestamp_utc=now_utc(),
            request={
                "emails": [item.strip() for item in args.low_float_alert_emails.split(",") if item.strip()],
                "contactName": args.low_float_alert_contact,
                "contactPhones": args.low_float_alert_phones,
                "threshold": "R99.00",
            },
            request={"email": "tshields@hotmail.co.za", "threshold": "R99.00"},
            response_status=None,
            response_json=None,
            response_text=None,
            notes="Cannot be forced via API; attach mailbox screenshot in final report.",
        )
    )

    return payout_ids


def run_mock_test(
    args: argparse.Namespace,
    report: List[TestResult],
    *,
    case_name: str,
    config_flag: str,
) -> None:
    headers = {"SiteCode": args.site_code, "ApiKey": args.api_key}

    get_url = f"{MOCK_BASE_URL}/gettestconfiguration?siteCode={urllib.parse.quote(args.site_code)}"
    current_cfg = http_json("GET", get_url, headers, None)
    report.append(
        TestResult(
            name=f"{case_name}: getTestConfiguration (before)",
            category="mock",
            status="pass" if is_success_status(current_cfg["status"]) else "fail",
            status="pass" if current_cfg["status"] < 400 else "fail",
            timestamp_utc=now_utc(),
            request={"siteCode": args.site_code},
            response_status=current_cfg["status"],
            response_json=current_cfg["json"],
            response_text=current_cfg["text"],
        )
    )

    cfg_payload = {
        "siteCode": args.site_code,
        "isAccountDecryptionFailed": False,
        "isNullResponse": False,
        "isInvalidStatusCode": False,
        "isPayoutMismatch": False,
        "isNotVerifiedResponse": False,
        "isAccountNumberDecryptionKeyMissing": False,
        "hasRetriedCountBeenExceeded": False,
    }
    cfg_payload[config_flag] = True

    set_url = f"{MOCK_BASE_URL}/settestconfiguration?siteCode={urllib.parse.quote(args.site_code)}"
    set_cfg = http_json("POST", set_url, headers, cfg_payload)
    report.append(
        TestResult(
            name=f"{case_name}: setTestConfiguration",
            category="mock",
            status="pass" if is_success_status(set_cfg["status"]) else "fail",
            status="pass" if set_cfg["status"] < 400 else "fail",
            timestamp_utc=now_utc(),
            request=cfg_payload,
            response_status=set_cfg["status"],
            response_json=set_cfg["json"],
            response_text=set_cfg["text"],
        )
    )

    verify_cfg = http_json("GET", get_url, headers, None)
    report.append(
        TestResult(
            name=f"{case_name}: getTestConfiguration (after)",
            category="mock",
            status="pass" if is_success_status(verify_cfg["status"]) else "fail",
            status="pass" if verify_cfg["status"] < 400 else "fail",
            timestamp_utc=now_utc(),
            request={"siteCode": args.site_code},
            response_status=verify_cfg["status"],
            response_json=verify_cfg["json"],
            response_text=verify_cfg["text"],
        )
    )

    payout_payload = build_request_payload(
        site_code=args.site_code,
        api_key=args.api_key,
        notify_url=args.notify_url,
        verify_url=args.verify_url,
        amount=0.1,
        account_number=DEFAULT_ACCOUNT,
        bank_group_id=args.bank_group_id,
        branch_code=args.branch_code,
        merchant_reference_prefix=f"mock-{case_name.lower()}",
    )
    request_result = http_json("POST", f"{MOCK_BASE_URL}/requestpayout", headers, payout_payload)
    payout_id = (request_result.get("json") or {}).get("payoutId")
    report.append(
        TestResult(
            name=f"{case_name}: requestpayout",
            category="mock",
            status="pass" if is_success_status(request_result["status"]) else "fail",
            status="pass" if request_result["status"] < 400 else "fail",
            timestamp_utc=now_utc(),
            request=payout_payload,
            response_status=request_result["status"],
            response_json=request_result["json"],
            response_text=request_result["text"],
        )
    )

    if payout_id:
        get_payout = http_json(
            "GET",
            f"{MOCK_BASE_URL}/getpayout?payoutId={urllib.parse.quote(payout_id)}",
            headers,
            None,
        )
        report.append(
            TestResult(
                name=f"{case_name}: getpayout",
                category="mock",
                status="pass" if is_success_status(get_payout["status"]) else "fail",
                status="pass" if get_payout["status"] < 400 else "fail",
                timestamp_utc=now_utc(),
                request={"payoutId": payout_id},
                response_status=get_payout["status"],
                response_json=get_payout["json"],
                response_text=get_payout["text"],
            )
        )


def build_docx_content(results: List[TestResult], metadata: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append("Ozow Payout Certification Report")
    lines.append(f"Generated UTC: {metadata['generated_utc']}")
    lines.append(f"SiteCode: {metadata['site_code']}")
    lines.append("")

    for result in results:
        lines.append(f"[{result.category.upper()}] {result.name}")
        lines.append(f"Status: {result.status}")
        lines.append(f"Timestamp (UTC): {result.timestamp_utc}")
        if result.response_status is not None:
            lines.append(f"HTTP Status: {result.response_status}")
        if result.notes:
            lines.append(f"Notes: {result.notes}")
        lines.append("Request JSON:")
        lines.append(json.dumps(result.request, indent=2, ensure_ascii=False))
        lines.append("Response JSON:")
        if result.response_json is not None:
            lines.append(json.dumps(result.response_json, indent=2, ensure_ascii=False))
        else:
            lines.append(result.response_text or "<no response>")
        lines.append("")

    paragraphs = "".join(
        f"<w:p><w:r><w:t xml:space='preserve'>{escape(line)}</w:t></w:r></w:p>" for line in lines
    )

    return textwrap.dedent(
        f"""<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<w:document xmlns:wpc=\"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas\" xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:m=\"http://schemas.openxmlformats.org/officeDocument/2006/math\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:wp14=\"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing\" xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" xmlns:w10=\"urn:schemas-microsoft-com:office:word\" xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:w14=\"http://schemas.microsoft.com/office/word/2010/wordml\" xmlns:wpg=\"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup\" xmlns:wpi=\"http://schemas.microsoft.com/office/word/2010/wordprocessingInk\" xmlns:wne=\"http://schemas.microsoft.com/office/word/2006/wordml\" xmlns:wps=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\" mc:Ignorable=\"w14 wp14\">
  <w:body>
    {paragraphs}
    <w:sectPr>
      <w:pgSz w:w=\"12240\" w:h=\"15840\"/>
      <w:pgMar w:top=\"1440\" w:right=\"1440\" w:bottom=\"1440\" w:left=\"1440\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/>
      <w:cols w:space=\"708\"/>
      <w:docGrid w:linePitch=\"360\"/>
    </w:sectPr>
  </w:body>
</w:document>
"""
    )


def write_docx(path: Path, document_xml: str) -> None:
    content_types = textwrap.dedent(
        """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""
    )
    rels = textwrap.dedent(
        """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""
    )

    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Ozow payout certification tests and export report.")
    parser.add_argument("--site-code", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--notify-url", required=True)
    parser.add_argument("--verify-url", default=None)
    parser.add_argument("--access-token", default=None)
    parser.add_argument("--website-url", default=None)
    parser.add_argument("--low-float-alert-contact", default="Mr. Tommy Shields")
    parser.add_argument("--low-float-alert-phones", default="082 462 7991")
    parser.add_argument("--low-float-alert-emails", default="tshields@hotmail.co.za,tommy@shieldsconsulting.co.za")
    parser.add_argument("--bank-group-id", default=DEFAULT_BANK_GROUP_ID)
    parser.add_argument("--branch-code", default=DEFAULT_BRANCH_CODE)
    parser.add_argument("--output-dir", default="artifacts/ozow")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    report: List[TestResult] = []
    payout_ids = run_standard_tests(args, report)

    run_mock_test(
        args,
        report,
        case_name="IsAccountDecryptionFailed",
        config_flag="isAccountDecryptionFailed",
    )
    run_mock_test(
        args,
        report,
        case_name="IsNotVerifiedResponse",
        config_flag="isNotVerifiedResponse",
    )
    run_mock_test(
        args,
        report,
        case_name="IsAccountDecryptionKeyMissing",
        config_flag="isAccountNumberDecryptionKeyMissing",
    )

    metadata = {
        "generated_utc": now_utc(),
        "site_code": args.site_code,
        "website_url": args.website_url,
        "notify_url": args.notify_url,
        "verify_url": args.verify_url,
        "access_token_configured": bool(args.access_token),
        "payout_ids": payout_ids,
    }

    json_payload = {
        "metadata": metadata,
        "results": [asdict(item) for item in report],
    }

    json_path = out_dir / "ozow-certification-report.json"
    docx_path = out_dir / "ozow-certification-report.docx"

    json_path.write_text(json.dumps(json_payload, indent=2, ensure_ascii=False), encoding="utf-8")
    write_docx(docx_path, build_docx_content(report, metadata))

    print(f"Wrote JSON report: {json_path}")
    print(f"Wrote Word report: {docx_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
