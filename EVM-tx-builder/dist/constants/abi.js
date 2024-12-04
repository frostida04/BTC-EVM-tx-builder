"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERC1155_ABI = exports.ERC721_ABI = exports.ERC20_ABI = void 0;
exports.ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
];
exports.ERC721_ABI = [
    'function transferFrom(address from, address to, uint256 tokenId)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function approve(address to, uint256 tokenId)',
    'function setApprovalForAll(address operator, bool approved)',
];
exports.ERC1155_ABI = [
    'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
    'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
    'function setApprovalForAll(address operator, bool approved)',
];
