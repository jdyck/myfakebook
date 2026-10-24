import type { Story } from "@ladle/react";
import { MyLibraryList } from "./my-library/my-library-list";
import { libraryFixtures } from "./my-library/my-library.fixtures";

export const EmptyLibrary: Story = () => <MyLibraryList {...libraryFixtures.empty} />;
EmptyLibrary.meta = { previewLayout: "fullscreen" };

export const PopulatedLibrary: Story = () => <MyLibraryList {...libraryFixtures.populated} />;
PopulatedLibrary.meta = { previewLayout: "fullscreen" };

export const LoadingLibrary: Story = () => <MyLibraryList {...libraryFixtures.loading} />;
LoadingLibrary.meta = { previewLayout: "fullscreen" };
